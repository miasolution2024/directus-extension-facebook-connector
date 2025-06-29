
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

export interface OmnichannelCreateRequest {
  page_id: string;
  page_name: string;
  token: string;
  is_enabled: boolean;
  expired_date: Date;
  source: OmnichannelSource;
}

export interface OmnichannelUpdateRequest {
  page_name: string;
  is_enabled: boolean;
  token: string;
}

export enum OmnichannelSource {
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

    const integrationLogsService = new ItemsService("integration_logs", {
      schema,
      accountability: req.accountability,
    });

    return integrationLogsService;
  } catch (error) {
    console.error("Error loading integration logs:", error);
    throw error;
  }
}

export async function GetOmnichannelsService(
  services: any,
  req: any,
  getSchema: any
): Promise<any> {
  try {
    const { ItemsService } = services;
    const schema = await getSchema();

    const OmnichannelsService = new ItemsService("omni_channels", {
      schema,
      accountability: req.accountability,
    });

    return OmnichannelsService;
  } catch (error) {
    console.error("Error loading omini channelss:", error);
    throw error;
  }
}

export async function AddOrUpdateOmnichannel(
  OmnichannelsService: any,
  page: any,
  isEnabled: boolean = false
) {
  try {
    console.log(
      `Adding or updating omini channel for page: ${page.name} (${page.id})`
    );
    const existingPage = await OmnichannelsService.readByQuery({
      filter: { page_id: { _eq: page.id } },
      sort: ["page_id"],
      limit: 1,
    });

    if (existingPage.length > 0) {
      const directusPageId = existingPage[0].id;
      await UpdateOmnichannel(
        directusPageId,
        OmnichannelsService,
        page,
        isEnabled
      );
    } else {
      await AddFacebookNewOmnichannel(OmnichannelsService, page);
    }
  } catch (error: any) {
    console.error(
      `Error adding or updating omini channel for page ${page.name} (${page.id}):`,
      error
    );
    throw error;
  }
}

export async function UpdateOmnichannel(
  directusPageId: string,
  OmnichannelsService: any,
  page: any,
  isEnabled: boolean = false
) {
  try {
    const updateOmnichannel: OmnichannelUpdateRequest = {
      page_name: page.name,
      token: page.access_token,
      is_enabled: isEnabled,
    };
    await OmnichannelsService.updateOne(directusPageId, updateOmnichannel);
  } catch (error: any) {
    throw error;
  }
}

export async function AddFacebookNewOmnichannel(
  OmnichannelsService: any,
  page: any
) {
  try {
    const newOmichannel: OmnichannelCreateRequest = {
      page_id: page.id,
      page_name: page.name,
      token: page.access_token,
      is_enabled: false,
      expired_date: page.expires_in,
      source: OmnichannelSource.Facebook,
    };
    await OmnichannelsService.createOne(newOmichannel);
  } catch (error: any) {
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
  stack_trace: string = "",
  context: string = ""
): Promise<string> {
  try {
    return await LogIntegrationEvent(services, req, getSchema, {
      level: "info",
      message,
      context: context,
      stack_trace: stack_trace,
      user_id: req.accountability ? req.accountability.user : null,
      request_string: "",
      response_string: "",
      timestamp: new Date(),
    });
  } catch (error: any) {
    throw new Error(`Error logging information: ${error.message || error}`);
  }
}
