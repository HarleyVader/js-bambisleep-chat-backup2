/**
 * Patreon API Client for Patron Verification
 * Verifies Bambi patron status and membership levels
 */

export class PatreonAPIClient {
    constructor(config) {
        this.accessToken = config.accessToken;
        this.userAgent = config.userAgent || 'BambiMCP/1.0.0';
        this.baseUrl = 'https://www.patreon.com/api/v2';
    }

    /**
     * Get current authenticated user
     */
    async getCurrentUser() {
        const response = await this.makeRequest('/identity', {
            'fields[user]': 'email,first_name,full_name,is_email_verified,vanity'
        });
        return response;
    }

    /**
     * Get user's memberships (patronage status)
     */
    async getUserMemberships() {
        const response = await this.makeRequest('/identity', {
            'include': 'memberships,memberships.currently_entitled_tiers',
            'fields[member]': 'currently_entitled_amount_cents,lifetime_support_cents,last_charge_status',
            'fields[tier]': 'amount_cents,title,description'
        });
        return response;
    }

    /**
     * Verify if user is a patron
     */
    async verifyPatronStatus() {
        try {
            const memberships = await this.getUserMemberships();

            if (!memberships.included) {
                return { isPatron: false, tier: null, status: 'not-patron' };
            }

            // Check for active memberships
            const activeMemberships = memberships.included.filter(item =>
                item.type === 'member' &&
                item.attributes.last_charge_status === 'Paid'
            );

            if (activeMemberships.length === 0) {
                return { isPatron: false, tier: null, status: 'inactive' };
            }

            // Get highest tier membership
            const membership = activeMemberships.reduce((highest, current) => {
                const currentAmount = current.attributes.currently_entitled_amount_cents || 0;
                const highestAmount = highest.attributes.currently_entitled_amount_cents || 0;
                return currentAmount > highestAmount ? current : highest;
            });

            return {
                isPatron: true,
                tier: membership.attributes.currently_entitled_amount_cents,
                status: 'active',
                membershipId: membership.id,
                lifetimeSupport: membership.attributes.lifetime_support_cents
            };

        } catch (error) {
            console.error('Patron verification failed:', error);
            return { isPatron: false, tier: null, status: 'error', error: error.message };
        }
    }

    /**
     * Make authenticated request to Patreon API
     */
    async makeRequest(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });

        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'User-Agent': this.userAgent,
            },
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }
}
