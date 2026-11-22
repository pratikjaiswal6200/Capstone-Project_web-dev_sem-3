# HTTP notes

The API uses JSON request bodies and a JSON response envelope, except on 204 responses. Lists have capped page sizes. Private responses send `Cache-Control: no-store`. Access tokens travel in the authorization header. The refresh credential travels in an HTTP-only cookie scoped to `/api/auth` and is rotated on use.
