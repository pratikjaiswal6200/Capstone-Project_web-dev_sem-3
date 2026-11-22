# Middleware

The API applies request IDs and logging, origin checks, bounded JSON parsing and cookie parsing before routing. The authentication router applies rate limits to sign-in and session operations. Protected routes load the user and session, then apply role middleware and controller-level resource checks. The final error middleware converts parsing, validation, conflict and server errors to one response format.
