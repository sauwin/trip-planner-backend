import { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  getAuthenticatedUser,
} from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { handleServiceError } from '../lib/serviceErrors';

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    const tokens = await registerUser(email, password, name);
    res.status(201).json(tokens);
  } catch (error: unknown) {
    handleServiceError(error, res, 'Registration failed', {
      EMAIL_TAKEN: { status: 409, message: 'Email already registered' },
    });
  }
}

export async function currentUser(req: AuthenticatedRequest, res: Response) {
  try {
    const user = await getAuthenticatedUser(req.userId!);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch current user');
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const tokens = await loginUser(email, password);
    res.json(tokens);
  } catch (error: unknown) {
    handleServiceError(error, res, 'Login failed', {
      INVALID_CREDENTIALS: { status: 401, message: 'Invalid email or password' },
    });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    const tokens = await refreshTokens(refreshToken);
    res.json(tokens);
  } catch (error: unknown) {
    handleServiceError(error, res, 'Refresh failed', {
      INVALID_REFRESH_TOKEN: { status: 401, message: 'Invalid or expired refresh token' },
    });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    await requestPasswordReset(email);
  } catch (error) {
    console.error(error);
  }

  res.json({ message: 'If this email is registered, a reset link has been sent.' });
}

export async function resetPasswordHandler(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;
    await resetPassword(token, newPassword);
    res.json({ message: 'Password has been reset successfully' });
  } catch (error: unknown) {
    handleServiceError(error, res, 'Failed to reset password', {
      INVALID_RESET_TOKEN: { status: 400, message: 'Reset link is invalid or has expired' },
    });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await logoutUser(refreshToken);
    }
    res.status(204).send();
  } catch (error) {
    handleServiceError(error, res, 'Logout failed');
  }
}