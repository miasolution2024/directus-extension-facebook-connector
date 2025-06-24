import { defineEndpoint } from "@directus/extensions-sdk";
import { handleFacebookCallback } from "./APIs/callback";
import { handleAuthRequest } from "./APIs/auth";

export default defineEndpoint((router, { services,  getSchema }) => {
  router.get("/api/facebook/auth", (req, res) =>
    handleAuthRequest(req, res,services, getSchema)
  );

  router.get("/api/facebook/auth/callback", (req, res) =>
    handleFacebookCallback(req, res, services, getSchema)
  );
});
