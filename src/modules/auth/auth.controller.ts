import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { AuthenticatedUser } from './types/authenticated-user';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from 'src/config/app.config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: AuthenticatedUser) {
    return {
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        provider: user.provider,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
      },
    };
  }

  // Google OAuth endpoints
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Inicia el flujo de autenticación con Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const user = await this.authService.findOrCreateGoogleUser(req.user);
      const accessToken = this.authService.generateJwtForUser(user);

      // Redirigir al frontend con el token
      const appConfig = this.configService.get<AppConfig>('app');
      const frontendUrl = appConfig?.frontendUrl;
      res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Authentication failed',
        error: error.message,
      });
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout() {
    // Con JWT, el logout se maneja en el frontend eliminando el token
    return { message: 'Logout successful' };
  }
}
