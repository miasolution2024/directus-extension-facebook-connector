import { redirectToErrorPage } from "../helper";
import {
  GetintegrationSettingsData,
  LogIntegrationEvent,
} from "../services/directus.service";

export async function handleAuthRequest(
  req: any,
  res: any,
  services: any,
  getSchema: any
) {
  const integrationSettingsData = await GetintegrationSettingsData(services, req, getSchema);
  try {
    const redirectUri = `${integrationSettingsData.public_directus_url}/directus-extension-facebook-connector/api/facebook/auth/callback`;
    const facebookAuthUrl =
      `https://www.facebook.com/v23.0/dialog/oauth?` +
      `client_id=${integrationSettingsData.facebook_app_id}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=pages_show_list,pages_manage_metadata,pages_messaging,pages_read_engagement&` +
      `response_type=code`;

    res.redirect(facebookAuthUrl);
  } catch (directusError: any) {
    const logId = await LogIntegrationEvent(services, req,  getSchema, {
      level: "error",
      message: `Failed to load handle auth request: ${directusError.message}`,
      context: "handleAuthRequest",
      stack_trace: JSON.stringify(directusError),
      user_id: req.accountability ? req.accountability.user : null,
      request_string: "",
      response_string: "",
      timestamp: new Date(),
    });

    redirectToErrorPage(res, integrationSettingsData.public_directus_url, logId);
  }
}
