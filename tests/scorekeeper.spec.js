import { expect, test } from "@playwright/test";

async function resetApplication(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function openSettings(page) {
  await page.locator("#nav button").filter({ hasText: "glages" }).click();
}

async function selectGame(page, gameName = "Belote") {
  await page.locator("#p-play .pick-chip").filter({ hasText: new RegExp(`^${gameName}$`) }).click();
}

async function selectPlayers(page, names = ["Alice", "Bob"]) {
  for (const name of names) {
    await page.locator("#p-play .player-chip").filter({ hasText: name }).click();
  }
}

async function startGame(page, names = ["Alice", "Bob"]) {
  await selectGame(page);
  await selectPlayers(page, names);
  await page.getByRole("button", { name: /Démarrer/ }).click();
  await expect(page.getByRole("heading", { name: "Belote" })).toBeVisible();
}

async function closeSheet(page) {
  const overlay = page.locator(".overlay");
  if (await overlay.count()) {
    await overlay.first().click({ position: { x: 10, y: 10 } });
    await expect(overlay).toHaveCount(0);
  }
}

async function typeDigits(page, digits, negative = false) {
  const sheet = page.locator(".sheet");
  if (negative) await sheet.getByRole("button", { name: "±", exact: true }).click();
  for (const digit of String(digits)) {
    await sheet.getByRole("button", { name: digit, exact: true }).click();
  }
}

// Saisit un score pour un joueur puis referme le pavé (même si la saisie en chaîne l'a gardé ouvert)
async function enterScore(page, playerName, digits, negative = false) {
  await closeSheet(page);
  await page.locator(".game-row").filter({ hasText: playerName }).click();
  await typeDigits(page, digits, negative);
  await page.locator(".sheet").getByRole("button", { name: /Valider|Modifier le score/ }).click();
  await closeSheet(page);
}

async function stored(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("sk_v3")));
}

function totals(state) {
  return Object.fromEntries(state.current.players.map(player => [player.name, player.total]));
}

function encodeExport(data) {
  return `SK1:${Buffer.from(JSON.stringify(data), "utf8").toString("base64")}`;
}

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:4173)/, route => route.abort());
  await resetApplication(page);
});

test("starts a game and records positive and negative scores", async ({ page }) => {
  await startGame(page);

  await enterScore(page, "Alice", 42);
  await enterScore(page, "Bob", 7, true);

  const state = await stored(page);
  expect(totals(state)).toEqual({ Alice: 42, Bob: -7 });
  await expect(page.getByLabel("Total Alice 42 points")).toBeVisible();
  await expect(page.getByLabel("Total Bob -7 points")).toBeVisible();
  // Tout le monde a saisi : la manche suivante démarre toute seule
  expect(state.current.round).toBe(2);
  await expect(page.locator(".sk-toast")).toContainText("Manche 1 complète");
});

test("edits an existing score without duplicating it", async ({ page }) => {
  await startGame(page);
  await enterScore(page, "Alice", 42);

  await page.locator(".game-row").filter({ hasText: "Alice" }).click();
  await page.getByRole("button", { name: "⌫", exact: true }).click();
  await page.getByRole("button", { name: "⌫", exact: true }).click();
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.getByRole("button", { name: "5", exact: true }).click();
  await page.getByRole("button", { name: /Modifier le score/ }).click();

  await expect(page.getByLabel("Total Alice 15 points")).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("sk_v3")));
  const alice = state.current.players.find(player => player.name === "Alice");
  expect(alice.scores).toEqual([{ r: 1, v: 15 }]);
  expect(alice.total).toBe(15);
});

test("edits a score from the round detail table", async ({ page }) => {
  await startGame(page);
  await enterScore(page, "Alice", 42);

  await page.getByRole("button", { name: "Tableau", exact: true }).click();
  await page.getByText("+42", { exact: true }).click();
  await page.getByRole("button", { name: "⌫", exact: true }).click();
  await page.getByRole("button", { name: "⌫", exact: true }).click();
  await page.getByRole("button", { name: "9", exact: true }).click();
  await page.getByRole("button", { name: "✓ Valider", exact: true }).click();

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("sk_v3")));
  const alice = state.current.players.find(player => player.name === "Alice");
  expect(alice.scores).toEqual([{ r: 1, v: 9 }]);
  expect(alice.total).toBe(9);
});

test("deletes an existing score and recalculates the total", async ({ page }) => {
  await startGame(page);
  await enterScore(page, "Alice", 42);

  await page.locator(".game-row").filter({ hasText: "Alice" }).click();
  await page.getByRole("button", { name: /Supprimer ce score/ }).click();

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("sk_v3")));
  const alice = state.current.players.find(player => player.name === "Alice");
  expect(alice.scores).toEqual([]);
  expect(alice.total).toBe(0);
});

test("finishes a game and keeps history after reload", async ({ page }) => {
  await startGame(page);
  await enterScore(page, "Alice", 30);
  await enterScore(page, "Bob", 10);

  await page.getByRole("button", { name: /Terminer la partie/ }).click();
  await expect(page.getByText(/Le gagnant est/)).toContainText("Alice");
  await page.getByRole("button", { name: /Confirmer/ }).click();

  // Les résultats s'affichent sur place, sans quitter l'onglet Jouer
  await expect(page.getByRole("heading", { name: "Résultats" })).toBeVisible();
  await expect(page.locator(".winner-hero")).toContainText("Alice");

  await page.reload();
  await page.locator("#nav button").filter({ hasText: "Historique" }).click();
  const history = page.locator("#p-history");
  await expect(history.getByText("Gagnant :")).toBeVisible();
  await expect(history.getByText("Alice", { exact: true })).toBeVisible();
  await expect(history.getByText("30 pts", { exact: true })).toBeVisible();
});

test("exports the complete state with the SK1 format", async ({ page }) => {
  await startGame(page);
  await enterScore(page, "Alice", 12);
  await enterScore(page, "Bob", 4);
  await page.getByRole("button", { name: /Terminer la partie/ }).click();
  await page.getByRole("button", { name: /Confirmer/ }).click();

  await openSettings(page);
  await page.getByRole("button", { name: /Exporter mes données/ }).click();
  const qrCanvas = page.locator(".sheet canvas");
  await expect(qrCanvas).toHaveCount(1);
  expect(await qrCanvas.evaluate(canvas =>
    canvas.toDataURL("image/png").startsWith("data:image/png;base64,")
  )).toBe(true);
  await page.getByRole("button", { name: /Texte/ }).click();

  const exportCode = await page.locator("textarea").inputValue();
  expect(exportCode.startsWith("SK1:")).toBe(true);

  const json = Buffer.from(exportCode.slice(4), "base64").toString("utf8");
  const exported = JSON.parse(json);
  expect(exported.version).toBe(1);
  expect(exported.sessions).toHaveLength(1);
  expect(exported.sessions[0].gameName).toBe("Belote");
  expect(exported.sessions[0].players.map(player => player.total)).toEqual([12, 4]);
});

test("renders stored names as text instead of executing HTML", async ({ page }) => {
  const payload = '<img src=x onerror="window.__scorekeeperXss=1">';
  await page.evaluate(value => {
    localStorage.setItem("sk_v3", JSON.stringify({
      games: [value],
      players: [{
        id: "unsafe-player",
        name: value,
        emoji: value,
        color: 'av0" onclick="window.__scorekeeperXss=1',
        groups: []
      }],
      sessions: [],
      current: {
        id: "unsafe-session",
        gameName: value,
        date: "2026-06-11",
        startedAt: Date.now(),
        players: [{
          id: "unsafe-player",
          name: value,
          emoji: value,
          color: 'av0" onclick="window.__scorekeeperXss=1',
          groups: [],
          scores: [],
          total: 0
        }],
        round: 1
      }
    }));
  }, payload);

  await page.reload();

  await expect(page.getByRole("heading", { name: payload })).toBeVisible();
  await expect(page.locator(".score-row .av")).toHaveClass("av av0");
  expect(await page.evaluate(() => window.__scorekeeperXss)).toBeUndefined();
});

test("keeps the previous state when localStorage rejects a change", async ({ page }) => {
  await openSettings(page);
  const before = await page.evaluate(() => localStorage.getItem("sk_v3"));

  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === "sk_v3") {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      return original.call(this, key, value);
    };
  });

  await page.getByPlaceholder("Nom du joueur…").fill("Diane");
  let dialogMessage = "";
  page.once("dialog", async dialog => {
    dialogMessage = dialog.message();
    await dialog.accept();
  });
  await page.getByRole("button", { name: "+ Ajouter le joueur" }).click();
  expect(dialogMessage).toContain("n'a pas pu être enregistrée");

  await expect(page.getByText("Joueurs (3)", { exact: true })).toBeVisible();
  await expect(page.getByText("Diane", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("sk_v3"))).toBe(before);
});

test("rejects an invalid import without replacing data", async ({ page }) => {
  await openSettings(page);
  const before = await page.evaluate(() => localStorage.getItem("sk_v3"));
  const invalidCode = encodeExport({
    version: 1,
    games: ["Belote"],
    players: [{ id: "p1", name: "Alice", emoji: "A" }]
  });

  await page.getByRole("button", { name: /Importer des données/ }).click();
  await page.locator(".sheet textarea").fill(invalidCode);
  await page.getByRole("button", { name: "✓ Importer" }).click();

  await expect(page.getByText("Historique invalide.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("sk_v3"))).toBe(before);
});

test("imports valid data and creates a backup of the previous state", async ({ page }) => {
  await openSettings(page);
  await page.getByPlaceholder("Nom du joueur…").fill("Diane");
  await page.getByRole("button", { name: "+ Ajouter le joueur" }).click();
  const previous = await page.evaluate(() => localStorage.getItem("sk_v3"));

  const importedData = {
    version: 1,
    games: ["Tarot"],
    players: [{ id: "n1", name: "Nora", emoji: "N", color: "av2", groups: [] }],
    sessions: [{
      id: "s1",
      gameName: "Tarot",
      date: "2026-06-11",
      startedAt: 1,
      finishedAt: 2,
      round: 1,
      players: [{
        id: "n1",
        name: "Nora",
        emoji: "N",
        color: "av2",
        groups: [],
        scores: [{ r: 1, v: 21 }],
        total: 21
      }]
    }]
  };

  await page.getByRole("button", { name: /Importer des données/ }).click();
  await page.locator(".sheet textarea").fill(encodeExport(importedData));
  page.on("dialog", async dialog => dialog.accept());
  await page.getByRole("button", { name: "✓ Importer" }).click();

  await expect.poll(async () => {
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("sk_v3")));
    return stored.players[0]?.name;
  }).toBe("Nora");
  expect(await page.evaluate(() => localStorage.getItem("sk_v3_backup"))).toBe(previous);
});

test("persists the selected theme after reload", async ({ page }) => {
  await openSettings(page);
  await page.locator('button[title="Mercure"]').click();

  expect(await page.evaluate(() => localStorage.getItem("sk_theme"))).toBe("mercure");
  expect(await page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--bg")
  )).toBe("#080d12");

  await page.reload();

  expect(await page.evaluate(() => localStorage.getItem("sk_theme"))).toBe("mercure");
  expect(await page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--bg")
  )).toBe("#080d12");
});

test("persists a custom player group and game", async ({ page }) => {
  await openSettings(page);

  await page.locator('input[placeholder^="Nom du joueur"]').fill("Diane");
  await page.getByRole("button", { name: /Famille/ }).click();
  await page.getByRole("button", { name: "+ Ajouter le joueur" }).click();

  const gameInput = page.locator('input[placeholder^="Nom du jeu"]');
  await gameInput.fill("Bridge");
  await gameInput.press("Enter");

  await page.reload();

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("sk_v3")));
  const player = state.players.find(item => item.name === "Diane");
  expect(player.groups).toEqual(["famille"]);
  expect(state.games).toContain("Bridge");
});

test("persists player edits made from settings", async ({ page }) => {
  await openSettings(page);

  const aliceRow = page.locator("#p-settings .card > div").filter({ hasText: "Alice" });
  await aliceRow.getByRole("button", { name: "✏️" }).click();
  await page.locator(".sheet input[type='text']").fill("Alicia");
  await page.locator(".sheet").getByRole("button", { name: /Amis/ }).click();
  await page.locator(".sheet").getByRole("button", { name: /Enregistrer/ }).click();

  await page.reload();

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("sk_v3")));
  const player = state.players.find(item => item.id === "p1");
  expect(player.name).toBe("Alicia");
  expect(player.groups).toEqual(["famille", "amis"]);
});

test("shows only three tabs and keeps stats inside history", async ({ page }) => {
  await expect(page.locator("#nav button")).toHaveCount(3);
  await expect(page.locator("#nav")).toContainText("Jouer");
  await expect(page.locator("#nav")).toContainText("Historique");
  await expect(page.locator("#nav")).toContainText("glages");

  await page.locator("#nav button").filter({ hasText: "Historique" }).click();
  await page.getByRole("button", { name: "Stats", exact: true }).click();
  await expect(page.getByText("Pas encore de stats")).toBeVisible();
});

test("starts without a game name and keeps the selection when creating a player", async ({ page }) => {
  await selectGame(page);
  await selectPlayers(page, ["Alice"]);

  await page.getByRole("button", { name: "+ Nouveau joueur" }).click();
  await page.getByPlaceholder("Prénom du joueur…").fill("Diane");
  await page.getByRole("button", { name: /Créer et ajouter/ }).click();

  await expect(page.locator("#p-play .pick-chip.on").filter({ hasText: /^Belote$/ })).toHaveCount(1);
  await expect(page.locator("#p-play .player-chip.on")).toHaveCount(2);
  await page.getByRole("button", { name: /Démarrer · Belote · 2 joueurs/ }).click();

  const state = await stored(page);
  expect(state.players.some(player => player.name === "Diane")).toBe(true);
  expect(state.current.players.map(player => player.name)).toEqual(["Alice", "Diane"]);
  expect(state.current.sessionLabel).toBe("");
  await expect(page.getByRole("heading", { name: "Belote" })).toBeVisible();
});

test("chains score entry and lets the user undo the automatic next round", async ({ page }) => {
  await startGame(page, ["Alice", "Bob", "Charlie"]);

  await page.getByRole("button", { name: /Saisir la manche 1/ }).click();
  await typeDigits(page, 10);
  await page.getByRole("button", { name: "✓ Valider → Bob" }).click();
  await typeDigits(page, 20);
  await page.getByRole("button", { name: "✓ Valider → Charlie" }).click();
  await typeDigits(page, 5, true);
  await page.getByRole("button", { name: "✓ Valider", exact: true }).click();

  await expect(page.locator(".overlay")).toHaveCount(0);
  let state = await stored(page);
  expect(totals(state)).toEqual({ Alice: 10, Bob: 20, Charlie: -5 });
  expect(state.current.round).toBe(2);

  await page.locator(".sk-toast").getByRole("button", { name: "Annuler" }).click();
  state = await stored(page);
  expect(state.current.round).toBe(1);
  await expect(page.getByText(/Tous ont saisi/)).toBeVisible();
});

test("replays the finished game with the same players from the results screen", async ({ page }) => {
  await startGame(page, ["Bob", "Alice"]);
  await enterScore(page, "Bob", 3);
  await page.getByRole("button", { name: /Terminer la partie/ }).click();
  await page.getByRole("button", { name: /Confirmer/ }).click();

  await page.getByRole("button", { name: /Rejouer · Belote/ }).click();
  const state = await stored(page);
  expect(state.sessions).toHaveLength(1);
  expect(state.current.gameName).toBe("Belote");
  expect(state.current.players.map(player => player.name)).toEqual(["Bob", "Alice"]);
  expect(state.current.players.every(player => player.total === 0)).toBe(true);
});

test("offers a one-tap replay card on the setup screen", async ({ page }) => {
  await startGame(page);
  await page.getByRole("button", { name: /Terminer la partie/ }).click();
  await page.getByRole("button", { name: /Confirmer/ }).click();
  await page.getByRole("button", { name: "Nouvelle partie" }).click();

  await expect(page.locator(".replay-card")).toContainText("Belote");
  await page.locator(".replay-card").click();
  const state = await stored(page);
  expect(state.current.players.map(player => player.name)).toEqual(["Alice", "Bob"]);
});
