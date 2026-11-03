import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsObject, ValidateNested } from 'class-validator';
import { LoginRequestDto } from '../../auth/dto/login-request.dto';
import { SigninRequestDto } from '../../auth/dto/signin-request.dto';

export class TipoPuntoLimpio {
    PUNTO_LIMPIO = 'punto_limpio'
    BOTELLERO = 'botellero'
    BOTELLERO_LATERO = 'botellero_latero'
}

export class CreatePuntoLimpioDto {
    nombre!: string;
    tipo!: TipoPuntoLimpio
}