/**
 * Patreon OAuth2 Authentication for MCP Agent Docking Station
 * Verifies Bambi patron status for agent access
 */

export class PatreonOAuth {
    constructor(config) {
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.redirectUri = config.redirectUri;
        this.baseUrl = 'https://www.patreon.com/api/oauth2';
    }

    /**
     * Generate authorization URL for Patreon OAuth
     */
    getAuthorizationUrl(scopes = ['identity', 'campaigns'], state = null) {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: scopes.join(' '),
        });

        if (state) {
            params.append('state', state);
        }

        return `${this.baseUrl}/authorize?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access tokens
     */
    async getTokens(code) {
        const response = await fetch(`${this.baseUrl}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                grant_type: 'authorization_code',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: this.redirectUri,
            }),
        });

        if (!response.ok) {
            throw new Error(`Token exchange failed: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshTokens(refreshToken) {
        const response = await fetch(`${this.baseUrl}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: this.clientId,
                client_secret: this.clientSecret,
            }),
        });

        if (!response.ok) {
            throw new Error(`Token refresh failed: ${response.status}`);
        }

        return await response.json();
    }
}
