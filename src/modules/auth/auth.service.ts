import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, AuthProvider } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string; // User ID
  name: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    provider: AuthProvider;
    avatar?: string;
  };
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, name, password } = registerDto;

    // Verificar si el usuario ya existe
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hashear la contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear el usuario
    const user = new this.userModel({
      email,
      name,
      password: hashedPassword,
      provider: AuthProvider.LOCAL,
    });

    await user.save();

    // Generar JWT
    const payload: JwtPayload = {
      sub: (user._id as Types.ObjectId).toString(),
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: (user._id as Types.ObjectId).toString(),
        email: user.email,
        name: user.name,
        provider: user.provider,
        avatar: user.avatar,
      },
      accessToken,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Buscar usuario
    const user = await this.userModel.findOne({ email, provider: AuthProvider.LOCAL });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password!);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Actualizar último login
    user.lastLoginAt = new Date();
    await user.save();

    // Generar JWT
    const payload: JwtPayload = {
      sub: (user._id as Types.ObjectId).toString(),
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: (user._id as Types.ObjectId).toString(),
        email: user.email,
        name: user.name,
        provider: user.provider,
        avatar: user.avatar,
      },
      accessToken,
    };
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    return this.userModel.findById(payload.sub);
  }

  async findOrCreateGoogleUser(profile: any): Promise<User> {
    const { id: providerId, emails, displayName, photos } = profile;
    const email = emails[0].value;
    const avatar = photos?.[0]?.value;

    // Buscar usuario existente por Google ID
    let user = await this.userModel.findOne({ 
      providerId, 
      provider: AuthProvider.GOOGLE 
    });

    if (!user) {
      // Buscar por email (en caso de que ya tenga cuenta local)
      const existingEmailUser = await this.userModel.findOne({ email });
      
      if (existingEmailUser) {
        throw new BadRequestException(
          'User with this email already exists. Please login with your password.'
        );
      }

      // Crear nuevo usuario con Google
      user = new this.userModel({
        email,
        name: displayName,
        provider: AuthProvider.GOOGLE,
        providerId,
        avatar,
        emailVerified: true, // Google emails are verified
      });

      await user.save();
    }

    // Actualizar último login
    user.lastLoginAt = new Date();
    await user.save();

    return user;
  }

  generateJwtForUser(user: User): string {
    const payload: JwtPayload = {
      sub: (user._id as Types.ObjectId).toString(),
      name: user.name,
    };

    return this.jwtService.sign(payload);
  }
}