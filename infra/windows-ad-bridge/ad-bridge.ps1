param(
    [string]$ListenPrefix = 'http://+:8085/',
    [string]$ApiKey,
    [string]$AllowedGroupName = 'temp-approved'
)

Import-Module ActiveDirectory

if (-not $ApiKey) {
    throw 'Informe -ApiKey para validar chamadas do worker.'
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($ListenPrefix)
$listener.Start()
Write-Host "AD bridge ouvindo em $ListenPrefix"

function Write-JsonResponse {
    param(
        [Parameter(Mandatory = $true)] $Context,
        [int]$StatusCode = 200,
        [hashtable]$Body = @{ ok = $true }
    )

    $json = ($Body | ConvertTo-Json -Depth 10)
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
    $Context.Response.StatusCode = $StatusCode
    $Context.Response.ContentType = 'application/json'
    $Context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
    $Context.Response.OutputStream.Close()
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
        if ($context.Request.Headers['X-Api-Key'] -ne $ApiKey) {
            Write-JsonResponse -Context $context -StatusCode 401 -Body @{ ok = $false; error = 'invalid api key' }
            continue
        }

        $path = $context.Request.Url.AbsolutePath
        $reader = New-Object System.IO.StreamReader($context.Request.InputStream, $context.Request.ContentEncoding)
        $rawBody = $reader.ReadToEnd()
        $payload = if ($rawBody) { $rawBody | ConvertFrom-Json } else { $null }

        if (-not $payload.userEmail -or -not $payload.groupName) {
            Write-JsonResponse -Context $context -StatusCode 400 -Body @{ ok = $false; error = 'userEmail and groupName are required' }
            continue
        }

        if ($payload.groupName -ne $AllowedGroupName) {
            Write-JsonResponse -Context $context -StatusCode 403 -Body @{ ok = $false; error = 'group not allowed' }
            continue
        }

        $user = Get-ADUser -Filter "UserPrincipalName -eq '$($payload.userEmail)'"
        if (-not $user) {
            Write-JsonResponse -Context $context -StatusCode 404 -Body @{ ok = $false; error = 'AD user not found' }
            continue
        }

        if ($path -eq '/v1/group-membership/apply') {
            Add-ADGroupMember -Identity $payload.groupName -Members $user.DistinguishedName -Confirm:$false
            Write-JsonResponse -Context $context -Body @{ ok = $true; action = 'apply'; user = $payload.userEmail; group = $payload.groupName }
            continue
        }

        if ($path -eq '/v1/group-membership/revoke') {
            Remove-ADGroupMember -Identity $payload.groupName -Members $user.DistinguishedName -Confirm:$false
            Write-JsonResponse -Context $context -Body @{ ok = $true; action = 'revoke'; user = $payload.userEmail; group = $payload.groupName }
            continue
        }

        Write-JsonResponse -Context $context -StatusCode 404 -Body @{ ok = $false; error = 'unknown route' }
    }
    catch {
        Write-JsonResponse -Context $context -StatusCode 500 -Body @{ ok = $false; error = $_.Exception.Message }
    }
}
