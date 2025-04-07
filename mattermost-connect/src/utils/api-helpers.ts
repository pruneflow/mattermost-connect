// src/utils/api-helpers.ts

/**
 * Authentication parameters for Mattermost login
 */
export interface AuthParams {
  /** Mattermost server URL */
  serverUrl: string;

  /** Username or email */
  username: string;

  /** User password */
  password: string;
}

/**
 * Token validation parameters
 */
export interface TokenValidationParams {
  /** Mattermost server URL */
  serverUrl: string;

  /** Token to validate */
  token: string;
}

/**
 * API utilities for working with Mattermost
 */
export const MattermostAPI = {
  /**
   * Creates a user token from credentials
   *
   * @param params - Authentication parameters
   * @returns A Promise resolving to the personal access token
   */
  createUserToken: async (params: AuthParams): Promise<string> => {
    const { serverUrl, username, password } = params;

    // Normalize server URL
    const baseUrl = serverUrl.endsWith("/")
      ? serverUrl.slice(0, -1)
      : serverUrl;

    try {
      // Step 1: Login and obtain session token
      const loginResponse = await fetch(`${baseUrl}/api/v4/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login_id: username,
          password,
        }),
      });

      if (!loginResponse.ok) {
        const error = await loginResponse.json().catch(() => ({}));
        throw new Error(
          error.message || `Authentication failed: ${loginResponse.status}`,
        );
      }

      // Get user ID
      const user = await loginResponse.json();
      const userId = user.id;

      // Get session token from headers
      const sessionToken = loginResponse.headers.get("Token");

      if (!sessionToken) {
        throw new Error("No session token returned from server");
      }

      // Step 2: Create a personal access token (PAT)
      const tokenResponse = await fetch(
        `${baseUrl}/api/v4/users/${userId}/tokens`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: "MattermostConnect Integration",
          }),
        },
      );

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json().catch(() => ({}));
        throw new Error(
          error.message || `Token creation failed: ${tokenResponse.status}`,
        );
      }

      // Return the token
      const tokenData = await tokenResponse.json();
      return tokenData.token;
    } catch (error) {
      console.error("Error creating user token:", error);
      throw error;
    }
  },

  /**
   * Validates if a token is valid
   *
   * @param params - Token validation parameters
   * @returns A Promise resolving to a boolean indicating if token is valid
   */
  validateToken: async (params: TokenValidationParams): Promise<boolean> => {
    const { serverUrl, token } = params;

    // Normalize server URL
    const baseUrl = serverUrl.endsWith("/")
      ? serverUrl.slice(0, -1)
      : serverUrl;

    try {
      // Try to get user info with this token
      const response = await fetch(`${baseUrl}/api/v4/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Error validating token:", error);
      return false;
    }
  },

  /**
   * Gets teams the user has access to
   *
   * @param params - Parameters with serverUrl and token
   * @returns A Promise resolving to an array of teams
   */
  getUserTeams: async (params: TokenValidationParams): Promise<any[]> => {
    const { serverUrl, token } = params;

    // Normalize server URL
    const baseUrl = serverUrl.endsWith("/")
      ? serverUrl.slice(0, -1)
      : serverUrl;

    try {
      const response = await fetch(`${baseUrl}/api/v4/users/me/teams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message || `Failed to get teams: ${response.status}`,
        );
      }

      return response.json();
    } catch (error) {
      console.error("Error getting teams:", error);
      throw error;
    }
  },

  /**
   * Gets channels in a team accessible by the user
   *
   * @param params - Parameters with serverUrl, token, and teamId
   * @returns A Promise resolving to an array of channels
   */
  getTeamChannels: async (
    params: TokenValidationParams & { teamId: string },
  ): Promise<any[]> => {
    const { serverUrl, token, teamId } = params;

    // Normalize server URL
    const baseUrl = serverUrl.endsWith("/")
      ? serverUrl.slice(0, -1)
      : serverUrl;

    try {
      const response = await fetch(
        `${baseUrl}/api/v4/users/me/teams/${teamId}/channels`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message || `Failed to get channels: ${response.status}`,
        );
      }

      return response.json();
    } catch (error) {
      console.error("Error getting channels:", error);
      throw error;
    }
  },
};

export default MattermostAPI;
