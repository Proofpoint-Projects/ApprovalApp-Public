import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { UsersService } from '../users/users.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  serializeUser(user: Record<string, unknown>, done: (error: Error | null, id?: unknown) => void) {
    done(null, user.id);
  }

  async deserializeUser(id: string, done: (error: Error | null, user?: unknown) => void) {
    try {
      const user = await this.usersService.findById(id);
      done(null, user || undefined);
    } catch (error) {
      done(error as Error);
    }
  }
}
