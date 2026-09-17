import { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
  requestPasswordReset,
  resetPassword,
} from '../services/auth.service';

export async function register(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const tokens = await registerUser(email, password);
    res.status(201).json(tokens);
  } catch (error: any) {
    if (error.message === 'EMAIL_TAKEN') {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const tokens = await loginUser(email, password);
    res.json(tokens);
  } catch (error: any) {
    if (error.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
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
  } catch (error: any) {
    if (error.message === 'INVALID_REFRESH_TOKEN') {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Refresh failed' });
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
  } catch (error: any) {
    if (error.message === 'INVALID_RESET_TOKEN') {
      res.status(400).json({ error: 'Reset link is invalid or has expired' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password' });
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
    console.error(error);
    res.status(500).json({ error: 'Logout failed' });
  }
}