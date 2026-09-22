import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/index.js';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<{ user: { id: string; email: string; role: string; fullName?: string } }> {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.role,
      registerDto.fullName,
    );
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<any> {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('refresh')
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<any> {
    return this.authService.refresh(refreshTokenDto.refresh_token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any): Promise<{ message: string }> {
    const token = req.headers['authorization']?.split(' ')[1];
    await this.authService.logout(token);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any): Promise<any> {
    return this.authService.getMe(req.user.id);
  }
}
