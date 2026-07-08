import { Request, Response, NextFunction } from 'express';
import { validatePDF } from '../src/middleware/validatePDF';

jest.mock('../src/utils/logger');

describe('validatePDF middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('returns 400 when file is missing', () => {
    validatePDF(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'FILE_MISSING' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 415 for non-pdf mimetype', () => {
    req.file = {
      mimetype: 'image/png',
      originalname: 'test.png',
      size: 10,
      buffer: Buffer.from('png'),
    } as Express.Multer.File;

    validatePDF(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(415);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next for valid PDF file', () => {
    req.file = {
      mimetype: 'application/pdf',
      originalname: 'test.pdf',
      size: 10,
      buffer: Buffer.from('%PDF-1.4\nabc'),
    } as Express.Multer.File;

    validatePDF(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });
});
