import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiExtraModels } from '@nestjs/swagger';

export function CreateUserSwagger() {
  return applyDecorators(
    // ApiExtraModels(ErrorResponseDto),
    ApiOperation({ summary: 'Crear usuario' }),
    ApiResponse({
      status: 201,
      description: 'Usuario creado exitosamente.',
    }),
    ApiResponse({
      status: 400,
      description: `Errores posibles:
- El email ya está en uso
- El password no cumple con los requisitos
- Falta el campo "name"
      `,
      content: {
        'application/json': {
          examples: {
            EmailYaRegistrado: {
              summary: 'Email ya registrado',
              value: {
                message: 'El email ya está en uso',
                errorCode: 'EMAIL_ALREADY_REGISTERED',
              },
            },
            PasswordDebil: {
              summary: 'Contraseña débil',
              value: {
                message: 'La contraseña no cumple los requisitos de seguridad',
                errorCode: 'WEAK_PASSWORD',
              },
            },
            CampoFaltante: {
              summary: 'Falta campo obligatorio',
              value: {
                message: 'Falta el campo "name"',
                errorCode: 'MISSING_NAME_FIELD',
              },
            },
          },
        },
      },
    }),
  );
}
