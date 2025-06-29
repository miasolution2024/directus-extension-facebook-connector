import { redirectToErrorPage, redirectToFrontend } from "../helper";
import {
  GetintegrationSettingsData,
  LogInformationEvent,
  LogIntegrationEvent,
} from "../services/directus.service";
import {
  ConfigureWebhook,
  GetAuthenticatedUserPages,
  GetGetLongLiveToken,
  SubscribePagesWebhook,
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
    return;
  }

  await LogInformationEvent(
    req,
    services,
    getSchema,
    `Redirect with authenticated code successfully`,
    code,
    "handleFacebookCallback"
  );


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
      `Short-lived User Access Token successfully`,
      shortLivedUserAccessToken,
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
      `Long-lived User Access Token successfully`,
      userAccessToken,
      "handleFacebookCallback"
    );

    const response = await ConfigureWebhook(integrationSettingsData);

    await LogInformationEvent(
      req,
      services,
      getSchema,
      `Configure webhook successfully`,
      JSON.stringify(response),
      "handleFacebookCallback"
    );

    const pages = await GetAuthenticatedUserPages(userAccessToken);

    await LogInformationEvent(
      req,
      services,
      getSchema,
      `Get authenticated user pages successfully`,
      JSON.stringify(pages),
      "handleFacebookCallback"
    );

    await SubscribePagesWebhook(
      req,
      services,
      getSchema,
      pages
    );

    redirectToFrontend(res, integrationSettingsData.public_directus_url);
  } catch (error: any) {
    
    const errorMessage =
      error instanceof Error
      ? error.stack || error.message
      : typeof error === "string"
      ? error
      : JSON.stringify(error);

    const logId = await LogIntegrationEvent(services, req, getSchema, {
      level: "error",
      message: `An unexpected error occurred during Facebook connection:`,
      context: "handleFacebookCallback",
      stack_trace: errorMessage,
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
