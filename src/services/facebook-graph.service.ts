import {
  AddOrUpdateOmnichannel,
  AppSettings,
  GetOmnichannelsService,
  LogInformationEvent,
} from "./directus.service";
import axiosInstance from "../axios";

export async function GetShortLiveToken(
  integrationSettingsData: AppSettings,
  redirectUri: string,
  code: string
): Promise<string> {
  try {
    const tokenExchangeUrl =
      `/oauth/access_token?` +
      `client_id=${integrationSettingsData.facebook_app_id}&` +
      `client_secret=${integrationSettingsData.facebook_app_secret}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `code=${code}`;

    const tokenResponse = await axiosInstance.get(tokenExchangeUrl);
    if (tokenResponse.data.error) {
      throw new Error(
        `Error getting short lived token: ${tokenResponse.data.error.message}`
      );
    }
    return tokenResponse.data.access_token;
  } catch (error: any) {
    throw error;
  }
}

export async function GetGetLongLiveToken(
  integrationSettingsData: AppSettings,
  shortLivedUserAccessToken: string
): Promise<string> {
  try {
    const longLivedTokenExchangeUrl =
      `/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${integrationSettingsData.facebook_app_id}&` +
      `client_secret=${integrationSettingsData.facebook_app_secret}&` +
      `fb_exchange_token=${shortLivedUserAccessToken}`;

    const longLivedTokenResponse = await axiosInstance.get(
      longLivedTokenExchangeUrl
    );
    if (longLivedTokenResponse.data.error) {
      throw new Error(
        `Error get long live token token: ${longLivedTokenResponse.data.error}`
      );
    }
    return (
      longLivedTokenResponse.data.access_token || shortLivedUserAccessToken
    );
  } catch (error: any) {
    throw error;
  }
}

export async function SubscribeFacebookPageWebhook(
  pageId: string,
  pageAccessToken: string
): Promise<void> {
  const subscribeUrl = `/${pageId}/subscribed_apps`;
  const fieldsToSubscribe = "messages";
  try {
    const response = await axiosInstance.post(subscribeUrl, {
      access_token: pageAccessToken,
      subscribed_fields: fieldsToSubscribe,
    });

    if (!response.data.success) {
      throw new Error(
        `Failed to subscribe webhook for page ${pageId}: ${response.data.error}`
      );
    }
  } catch (error: any) {
    throw error;
  }
}

export async function GetAuthenticatedUserPages(
  userAccessToken: string
): Promise<any[]> {
  try {
    const pagesUrl = `/me/accounts?access_token=${userAccessToken}`;
    const pagesResponse = await axiosInstance.get(pagesUrl);
    const pages: any[] = pagesResponse.data.data;
    if (!pages || pages.length === 0) {
      throw new Error("No Facebook Pages found for the user.");
    }
    return pages;
  } catch (error: any) {
    throw error;
  }
}

export async function SubscribePagesWebhook(
  req: any,
  services: any,
  getSchema: any,
  pages: any[]
) {
  const OmnichannelsService = await GetOmnichannelsService(services, req, getSchema);
  
  try {
    for (const page of pages) {
      await SubscribeFacebookPageWebhook(page.id, page.access_token);

      await AddOrUpdateOmnichannel(OmnichannelsService, page, true);

      await LogInformationEvent(
        req,
        services,
        getSchema,
        `Subscribed to webhook for page ${page.name} (${page.id}) successfully`,
        JSON.stringify(page),
        "SubscribePagesWebhook"
      );
    }
  } catch (error: any) {
    throw error;
  }
}

export async function ConfigureWebhook(
  integrationSettingsData: AppSettings
): Promise<any> {
  try {
    const appAccessToken = await GetAppAccessToken(integrationSettingsData);
    const response = await axiosInstance.post(
      `/${integrationSettingsData.facebook_app_id}/subscriptions?access_token=${appAccessToken}`,
      {
        object: "page",
        callback_url: integrationSettingsData.n8n_webhook_url,
        fields: "messages",
        verify_token: integrationSettingsData.webhook_verify_token,
      }
    );

    if (response.data.error) {
      throw new Error(
        `Error configuring webhook: ${response.data.error.message}`
      );
    }
    return response.data;
  } catch (error: any) {
    throw error;
  }
}

export async function GetAppAccessToken(
  integrationSettingsData: AppSettings
): Promise<string> {
  try {
    const appAccessTokenUrl =
      `/oauth/access_token?` +
      `client_id=${integrationSettingsData.facebook_app_id}&` +
      `client_secret=${integrationSettingsData.facebook_app_secret}&` +
      `grant_type=client_credentials`;

    const response = await axiosInstance.get(appAccessTokenUrl);
    if (response.data.error) {
      throw new Error(
        `Error getting app access token: ${response.data.error.message}`
      );
    }
    return response.data.access_token;
  } catch (error: any) {
    throw error;
  }
}
