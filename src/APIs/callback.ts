import { redirectToErrorPage, redirectToFrontend } from "../helper";
import {
  GetintegrationSettingsData,
  LogInformationEvent,
  LogIntegrationEvent,
} from "../services/directus.service";
import {
  ConfigureWebhook,
  GetGetLongLiveToken,
  GetPagesAndSubscribeWebhooks,
  GetShortLiveToken,
} from "../services/facebook-graph.service";

export async function handleFacebookCallback(
  req: any,
  res: any,
  services: any,
  getSchema: any
) {
  const code = req.query.code;
  const integrationSettingsData = await GetintegrationSettingsData(
    services,
    req,
    getSchema
  );

  if (!code) {
    const logId = await LogIntegrationEvent(services, req, getSchema, {
      level: "error",
      message: `No authorization code received from Facebook.`,
      context: "handleFacebookCallback",
      stack_trace: "No authorization code received from Facebook.",
      user_id: req.accountability ? req.accountability.user : null,
      request_string: "",
      response_string: "",
      timestamp: new Date(),
    });

    redirectToErrorPage(
      res,
      integrationSettingsData.public_directus_url,
      logId
    );
  }

  await LogInformationEvent(
    req,
    services,
    getSchema,
    `code: ${code}`,
    "handleFacebookCallback"
  );

  const { ItemsService } = services;
  const schema = await getSchema();

  const ominiChannelsService = new ItemsService("omini_channels", {
    schema,
    accountability: req.accountability,
  });

  const redirectUri = `${integrationSettingsData.public_directus_url}/directus-extension-facebook-connector/api/facebook/auth/callback`;

  try {
    const shortLivedUserAccessToken = await GetShortLiveToken(
      integrationSettingsData,
      redirectUri,
      code
    );

    await LogInformationEvent(
      req,
      services,
      getSchema,
      `Short-lived User Access Token: ${shortLivedUserAccessToken}`,
      "handleFacebookCallback"
    );

    const userAccessToken = await GetGetLongLiveToken(
      integrationSettingsData,
      shortLivedUserAccessToken
    );

    await LogInformationEvent(
      req,
      services,
      getSchema,
      `Long-lived User Access Token: ${userAccessToken}`,
      "handleFacebookCallback"
    );

    await ConfigureWebhook(integrationSettingsData);

     await LogInformationEvent(
      req,
      services,
      getSchema,
      `Configure webhook successfully`,
      "handleFacebookCallback"
    );

    const connectedPagesCount = await GetPagesAndSubscribeWebhooks(
      ominiChannelsService,
      userAccessToken
    );

    await LogInformationEvent(
      req,
      services,
      getSchema,
      `Connected ${connectedPagesCount} Facebook Page(s) and subscribed to webhooks.`,
      "handleFacebookCallback"
    );
    
    redirectToFrontend(res, integrationSettingsData.public_directus_url);
  } catch (error: any) {
    const logId = await LogIntegrationEvent(services, req, getSchema, {
      level: "error",
      message: `An unexpected error occurred during Facebook connection:`,
      context: "handleFacebookCallback",
      stack_trace: JSON.stringify(error),
      user_id: req.accountability ? req.accountability.user : null,
      request_string: "",
      response_string: "",
      timestamp: new Date(),
    });
    redirectToErrorPage(
      res,
      integrationSettingsData.public_directus_url,
      logId
    );
  }
}
