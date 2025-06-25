export interface AppSettings {
  facebook_app_id: string;
  facebook_app_secret: string;
  public_directus_url: string;
  webhook_verify_token: string;
  n8n_webhook_url: string;
}

export interface IntegrationLog {
  timestamp: Date;
  level: string;
  request_string: string;
  message: string;
  stack_trace: string;
  response_string: string;
  user_id: string;
  context: string;
}

export interface OminichannelCreateRequest {
  page_id: string;
  page_name: string;
  token: string;
  is_enabled: boolean;
  expired_date: Date;
  source: OminichannelSource;
}

export interface OminichannelUpdateRequest {
  page_name: string;
  token: string;
}

export enum OminichannelSource {
  Facebook = "Facebook",
  Tiktok = "Tiktok",
  Zalo = "Zalo",
}

export async function GetintegrationSettingsData(
  services: any,
  req: any,
  getSchema: any
): Promise<AppSettings> {
  const { ItemsService } = services;
  const schema = await getSchema();

  const integrationSettingsService = new ItemsService("integration_settings", {
    schema,
    accountability: req.accountability,
  });

  try {
    const integrationSettings = await integrationSettingsService.readByQuery({
      limit: 1,
    });

    if (integrationSettings.length === 0) {
      throw new Error("No intergration settings found in Directus.");
    }
    const integrationSettingsData = integrationSettings[0] as AppSettings;

    if (
      !integrationSettingsData.facebook_app_id ||
      !integrationSettingsData.facebook_app_secret ||
      !integrationSettingsData.public_directus_url ||
      !integrationSettingsData.webhook_verify_token
    ) {
      throw new Error("App settings data is empty in Directus.");
    }
    return integrationSettingsData;
  } catch (error) {
    console.error("Error loading app settings:", error);
    throw error;
  }
}

export async function GetIntegrationLogsService(
  services: any,
  req: any,
  getSchema: any
): Promise<any> {
  try {
    const { ItemsService } = services;
    const schema = await getSchema();

    const fbPagesService = new ItemsService("integration_logs", {
      schema,
      accountability: req.accountability,
    });

    return fbPagesService;
  } catch (error) {
    console.error("Error loading integration logs:", error);
    throw error;
  }
}

export async function LogIntegrationEvent(
  services: any,
  req: any,
  getSchema: any,
  logEntry: IntegrationLog
): Promise<string> {
  try {
    const integrationLogsService = await GetIntegrationLogsService(
      services,
      req,
      getSchema
    );

    const data = await integrationLogsService.createOne(logEntry);
    return data.id;
  } catch (error: any) {
    throw new Error(
      `Error logging integration event: ${error.message || error}`
    );
  }
}

export async function LogInformationEvent(
  req: any,
  services: any,
  getSchema: any,
  message: string,
  context: string = ""
): Promise<string> {
  try {
    return await LogIntegrationEvent(services, req, getSchema, {
      level: "info",
      message,
      context: context,
      stack_trace: "",
      user_id: req.accountability ? req.accountability.user : null,
      request_string: "",
      response_string: "",
      timestamp: new Date(),
    });
  } catch (error: any) {
    throw new Error(`Error logging information: ${error.message || error}`);
  }
}
