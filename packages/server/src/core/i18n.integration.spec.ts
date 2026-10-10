import {
  Body,
  Controller,
  Get,
  INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { I18nModule } from 'nestjs-i18n';
import request from 'supertest';
import { AppError } from '../common/errors/app-error';
import { buildI18nOptions } from '../common/i18n/i18n-options';
import { MessageResolver } from '../common/i18n/message-resolver';
import { I18nExceptionFilter } from './filters/i18n-exception.filter';
import { LocalizedValidationPipe } from '../common/errors/localized-validation.pipe';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

class SampleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;
}

@Controller('probe')
class ProbeController {
  @Get('missing')
  missing(): void {
    throw new AppError('MEMBER_NOT_FOUND');
  }

  @Get('templated')
  templated(): void {
    throw new AppError('OBLIGATION_EXCEEDS_BALANCE', { balance: '99.50' });
  }

  @Post('validate')
  validate(@Body() dto: SampleDto): SampleDto {
    return dto;
  }
}

@Module({
  imports: [I18nModule.forRoot(buildI18nOptions())],
  controllers: [ProbeController],
  providers: [
    MessageResolver,
    { provide: APP_FILTER, useClass: I18nExceptionFilter },
  ],
})
class ProbeModule {}

/**
 * Exercises the real HTTP path: `Accept-Language` header → resolver →
 * request-scoped context → filter → response body.
 */
describe('i18n over HTTP', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new LocalizedValidationPipe());
    // A real listening socket, so concurrent requests share one server (and one
    // event loop) instead of each supertest call binding its own.
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('answers in Spanish when the client asks for Spanish', async () => {
    const res = await request(baseUrl)
      .get('/probe/missing')
      .set('Accept-Language', 'es')
      .expect(404);

    expect(res.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      code: 'MEMBER_NOT_FOUND',
      message: 'Socio no encontrado',
    });
  });

  it('answers in English for an English request, with the same code (scenario 5)', async () => {
    const res = await request(baseUrl)
      .get('/probe/missing')
      .set('Accept-Language', 'en')
      .expect(404);

    expect(res.body.code).toBe('MEMBER_NOT_FOUND');
    expect(res.body.message).toBe('Member not found');
  });

  it('interpolates parameters in the negotiated language', async () => {
    const res = await request(baseUrl)
      .get('/probe/templated')
      .set('Accept-Language', 'es')
      .expect(409);

    expect(res.body.message).toBe(
      'El monto excede el saldo pendiente (99.50 Bs)',
    );
    expect(res.body.message).not.toContain('{{');
  });

  it('falls back to the server default without a language header (scenario 9)', async () => {
    const res = await request(baseUrl).get('/probe/missing').expect(404);

    expect(res.body.message).toBe('Member not found');
  });

  it('localizes DTO validation errors (scenario 3)', async () => {
    const res = await request(baseUrl)
      .post('/probe/validate')
      .set('Accept-Language', 'es')
      .send({ name: '', email: 'nope' })
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.message).toEqual([
      'name no puede estar vacío',
      'email debe ser un correo electrónico válido',
    ]);
  });

  it('keeps concurrent requests in different languages apart (scenario 10)', async () => {
    const [spanish, english] = await Promise.all([
      request(baseUrl).get('/probe/missing').set('Accept-Language', 'es'),
      request(baseUrl).get('/probe/missing').set('Accept-Language', 'en'),
    ]);

    expect(spanish.body.message).toBe('Socio no encontrado');
    expect(english.body.message).toBe('Member not found');
  });
});
