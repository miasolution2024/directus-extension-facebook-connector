import axios from "axios";
import {
  AppSettings,
  OminichannelCreateRequest,
  OminichannelSource,
  OminichannelUpdateRequest,
} from "./directus.service";

export async function GetShortLiveToken(
  integrationSettingsData: AppSettings,
  redirectUri: string,
  code: string
): Promise<string> {
  const tokenExchangeUrl =
    `https://graph.facebook.com/v23.0/oauth/access_token?` +
    `client_id=${integrationSettingsData.facebook_app_id}&` +
    `client_secret=${integrationSettingsData.facebook_app_secret}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `code=${code}`;

  const tokenResponse = await axios.get(tokenExchangeUrl);
  if (tokenResponse.data.error) {
    throw new Error(
      `Error exchanging code for token: ${tokenResponse.data.error.message}`
    );
  }

  return tokenResponse.data.access_token;
}

export async function GetGetLongLiveToken(
  integrationSettingsData: AppSettings,
  shortLivedUserAccessToken: string
): Promise<string> {
  const longLivedTokenExchangeUrl =
    `https://graph.facebook.com/v23.0/oauth/access_token?` +
    `grant_type=fb_exchange_token&` +
    `client_id=${integrationSettingsData.facebook_app_id}&` +
    `client_secret=${integrationSettingsData.facebook_app_secret}&` +
    `fb_exchange_token=${shortLivedUserAccessToken}`;

  const longLivedTokenResponse = await axios.get(longLivedTokenExchangeUrl);
  if (longLivedTokenResponse.data.error) {
    throw new Error(
      `Error get long live token token: ${longLivedTokenResponse.data.error}`
    );
  }
  return longLivedTokenResponse.data.access_token || shortLivedUserAccessToken;
}

export async function SubscribePageWebhook(
  ominiChannelsService: any,
  pageId: string,
  pageAccessToken: string
): Promise<void> {
  const subscribeUrl = `https://graph.facebook.com/v23.0/${pageId}/subscribed_apps`;
  const fieldsToSubscribe = "messages";
  try {
    const response = await axios.post(subscribeUrl, {
      access_token: pageAccessToken,
      subscribed_fields: fieldsToSubscribe,
    });

    if (response.data.success) {
      const existingPage = await ominiChannelsService.readByQuery({
        filter: { page_id: { _eq: pageId } },
        limit: 1,
      });
      if (existingPage.length > 0) {
        await ominiChannelsService.updateOne(existingPage[0].id, {
          is_enabled: true,
        });
      }
    } else {
      throw new Error(
        `Failed to subscribe webhook for page ${pageId}: ${response.data.error}`
      );
    }
  } catch (error: any) {
    throw new Error(
      `Error during webhook subscription for page ${pageId}: ${
        error.response?.data || error.message
      }`
    );
  }
}

export async function GetPagesAndSubscribeWebhooks(
  ominiChannelsService: any,
  integrationSettingsData: AppSettings,
  userAccessToken: string
): Promise<number> {
  const pagesUrl = `https://graph.facebook.com/v23.0/me/accounts?access_token=${userAccessToken}`;
  const pagesResponse = await axios.get(pagesUrl);
  const pages: any[] = pagesResponse.data.data;
  if (!pages || pages.length === 0) {
    throw new Error("No Facebook Pages found for the user.");
  }

  await ConfigureWebhook(integrationSettingsData);

  let connectedPagesCount = 0;
  for (const page of pages) {
    try {
      const existingPage = await ominiChannelsService.readByQuery({
        filter: { page_id: { _eq: page.id } },
        limit: 1,
      });

      if (existingPage.length > 0) {
        const updateOminichannel: OminichannelUpdateRequest = {
          page_name: page.name,
          token: page.access_token,
        };
        await ominiChannelsService.updateOne(
          existingPage[0].id,
          updateOminichannel
        );
      } else {
        const newOmichannel: OminichannelCreateRequest = {
          page_id: page.id,
          page_name: page.name,
          token: page.access_token,
          is_enabled: false,
          expired_date: page.expires_in,
          source: OminichannelSource.Facebook,
        };
        await ominiChannelsService.createOne(newOmichannel);
      }
      connectedPagesCount++;
      await SubscribePageWebhook(
        ominiChannelsService,
        page.id,
        page.access_token
      );
    } catch (directusError: any) {
      throw new Error(
        `Error saving/subscribing page ${page.id} to Directus/Facebook: ${directusError.message}`
      );
    }
  }
  return connectedPagesCount;
}

export async function ConfigureWebhook(
  integrationSettingsData: AppSettings
): Promise<void> {
  const appAccessToken = await GetAppAccessToken(integrationSettingsData);
  const response = await axios.post(
    `https://graph.facebook.com/v23.0/${integrationSettingsData.facebook_app_id}/subscriptions?access_token=${appAccessToken}`,
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
}

export async function GetAppAccessToken(
  integrationSettingsData: AppSettings
): Promise<string> {
  const appAccessTokenUrl =
    `https://graph.facebook.com/v23.0/oauth/access_token?` +
    `client_id=${integrationSettingsData.facebook_app_id}&` +
    `client_secret=${integrationSettingsData.facebook_app_secret}&` +
    `grant_type=client_credentials`;

  const response = await axios.get(appAccessTokenUrl);
  if (response.data.error) {
    throw new Error(
      `Error getting app access token: ${response.data.error.message}`
    );
  }
  return response.data.access_token;
}
