import { expect, test } from "@playwright/test";

// Humo Fase 7: landing → login → dashboard con el admin sembrado.
// Solo lee/escribe lo que el uso normal genera (lastLoginAt + LOGIN auditado).
test("landing expone el producto y el login lleva al dashboard", async ({ page }) => {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  test.skip(!email || !password, "sin credenciales de prueba en env");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /ajuste por inflación fiscal/i })).toBeVisible();
  await page.getByRole("link", { name: /entrar al sistema/i }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel(/correo electrónico/i).fill(email!);
  await page.getByLabel(/contraseña/i).fill(password!);
  await page.getByRole("button", { name: /entrar y comenzar/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
});

test("respuestas traen headers de seguridad", async ({ request }) => {
  const res = await request.get("/");
  expect(res.ok()).toBeTruthy();
  const headers = res.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"] ?? "").toContain("frame-ancestors 'none'");
});
