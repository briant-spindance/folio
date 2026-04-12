# OAuth Integration - Provider Setup Guide

## Supported Providers

### Google
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Set redirect URI to `https://app.example.com/auth/google/callback`
4. Required scopes: `openid`, `email`, `profile`

### GitHub
1. Go to GitHub Developer Settings
2. Create a new OAuth App
3. Set callback URL to `https://app.example.com/auth/github/callback`
4. Required scopes: `user:email`, `read:user`

### Microsoft / Azure AD
1. Register an application in Azure Portal
2. Set redirect URI to `https://app.example.com/auth/microsoft/callback`
3. Required scopes: `openid`, `email`, `profile`, `User.Read`

## Environment Variables

```env
OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_GITHUB_CLIENT_ID=
OAUTH_GITHUB_CLIENT_SECRET=
OAUTH_MICROSOFT_CLIENT_ID=
OAUTH_MICROSOFT_CLIENT_SECRET=
OAUTH_MICROSOFT_TENANT_ID=
```

## Token Storage

JWT tokens are stored in `httpOnly` cookies with:
- `Secure` flag (HTTPS only)
- `SameSite=Lax`
- 7-day expiry with rolling refresh
