import type {
    ExecuteJobResult,
    ValidationResult,
} from "../../../runtime/offeringTypes.js";

// ─── Clawsseum Champion Stats ────────────────────────────────────────────────
// These are the home fighter stats for the Clawsseum agent.
// Modify these values to tune the champion's power level.
const CHAMPION = {
    name: "Clawsseum Champion",
    attack: 75,
    defense: 70,
    speed: 80,
    hp: 100,
    special_skill: "Claw Storm",
};

// ─── Stat Caps ────────────────────────────────────────────────────────────────
const STAT_MIN = 1;
const STAT_MAX = 100;
const BASE_HP = 100;

// ─── Validate incoming challenger stats ───────────────────────────────────────
export function validateRequirements(request: any): ValidationResult {
    const { fighter_name, attack, defense, speed, hp } = request;

    if (!fighter_name || typeof fighter_name !== "string" || fighter_name.trim() === "") {
        return { valid: false, reason: "fighter_name must be a non-empty string." };
    }

    for (const [key, val] of Object.entries({ attack, defense, speed })) {
        if (typeof val !== "number" || val < STAT_MIN || val > STAT_MAX) {
            return {
                valid: false,
                reason: `Stat "${key}" must be a number between ${STAT_MIN} and ${STAT_MAX}. Got: ${val}`,
            };
        }
    }

    if (hp !== undefined && (typeof hp !== "number" || hp < 1 || hp > 500)) {
        return { valid: false, reason: `"hp" must be a number between 1 and 500. Got: ${hp}` };
    }

    return { valid: true };
}

// ─── Custom payment message ───────────────────────────────────────────────────
export function requestPayment(request: any): string {
    return `⚔️ Battle accepted! ${request.fighter_name} vs ${CHAMPION.name} — preparing the arena...`;
}

// ─── Battle Simulation ────────────────────────────────────────────────────────
export async function executeJob(request: any): Promise<ExecuteJobResult> {
    const challenger = {
        name: String(request.fighter_name).trim(),
        attack: Number(request.attack),
        defense: Number(request.defense),
        speed: Number(request.speed),
        hp: request.hp ? Number(request.hp) : BASE_HP,
        special_skill: request.special_skill ? String(request.special_skill) : null,
        strategy: request.strategy ?? "balanced",
    };

    const champion = { ...CHAMPION };

    // Apply strategy modifiers
    applyStrategy(challenger);

    const log: string[] = [];
    const separator = "─".repeat(40);

    log.push(`🏟️  CLAWSSEUM ARENA BATTLE`);
    log.push(separator);
    log.push(`🔵 Challenger: ${challenger.name}`);
    log.push(`   ATK: ${challenger.attack} | DEF: ${challenger.defense} | SPD: ${challenger.speed} | HP: ${challenger.hp}`);
    if (challenger.special_skill) log.push(`   Special: ${challenger.special_skill}`);
    log.push(`   Strategy: ${challenger.strategy.toUpperCase()}`);
    log.push("");
    log.push(`🔴 Champion:   ${champion.name}`);
    log.push(`   ATK: ${champion.attack} | DEF: ${champion.defense} | SPD: ${champion.speed} | HP: ${champion.hp}`);
    log.push(`   Special: ${champion.special_skill}`);
    log.push(separator);
    log.push("");

    // Determine first attacker by speed (add small random factor)
    const challengerInitiative = challenger.speed + Math.random() * 10;
    const championInitiative = champion.speed + Math.random() * 10;
    const firstAttacker = challengerInitiative >= championInitiative ? "challenger" : "champion";
    log.push(`🎲 Initiative roll: ${challenger.name} [${challengerInitiative.toFixed(1)}] vs ${champion.name} [${championInitiative.toFixed(1)}]`);
    log.push(`⚡ ${firstAttacker === "challenger" ? challenger.name : champion.name} strikes first!\n`);

    // ── Round-by-round simulation ──────────────────────────────────────────────
    let round = 1;
    let challengerHP = challenger.hp;
    let championHP = champion.hp;
    let specialUsedChallenger = false;
    let specialUsedChampion = false;
    const MAX_ROUNDS = 10;

    while (challengerHP > 0 && championHP > 0 && round <= MAX_ROUNDS) {
        log.push(`🔸 Round ${round}`);

        const attackers =
            firstAttacker === "challenger"
                ? [
                    { attacker: challenger, attackerHP: challengerHP, defenderName: champion.name, side: "challenger" },
                    { attacker: champion, attackerHP: championHP, defenderName: challenger.name, side: "champion" },
                ]
                : [
                    { attacker: champion, attackerHP: championHP, defenderName: challenger.name, side: "champion" },
                    { attacker: challenger, attackerHP: challengerHP, defenderName: champion.name, side: "challenger" },
                ];

        for (const turn of attackers) {
            if (challengerHP <= 0 || championHP <= 0) break;

            const isChallenger = turn.side === "challenger";
            const currentAttackerHP = isChallenger ? challengerHP : championHP;
            const currentDefenderHP = isChallenger ? championHP : challengerHP;
            const defenderDef = isChallenger ? champion.defense : challenger.defense;

            // Special skill triggers at low HP (≤30%) once per fighter
            let dmg = calcDamage(turn.attacker.attack, defenderDef);
            let skillLine = "";

            if (
                currentAttackerHP / turn.attacker.hp <= 0.3 &&
                turn.attacker.special_skill &&
                !(isChallenger ? specialUsedChallenger : specialUsedChampion)
            ) {
                dmg = Math.round(dmg * 2.2); // special skill deals 2.2x damage
                skillLine = ` 💥 SPECIAL: ${turn.attacker.special_skill}!`;
                if (isChallenger) specialUsedChallenger = true;
                else specialUsedChampion = true;
            }

            if (isChallenger) {
                championHP = Math.max(0, championHP - dmg);
            } else {
                challengerHP = Math.max(0, challengerHP - dmg);
            }

            log.push(
                `   ${isChallenger ? "🔵" : "🔴"} ${turn.attacker.name} attacks ${turn.defenderName} for ${dmg} dmg${skillLine}` +
                ` → ${turn.defenderName} HP: ${isChallenger ? championHP : challengerHP}`
            );
        }

        log.push("");
        round++;
    }

    // ── Determine winner ───────────────────────────────────────────────────────
    let winner: string;
    let result: string;

    if (challengerHP > 0 && championHP <= 0) {
        winner = challenger.name;
        result = `🏆 WINNER: ${challenger.name} — The challenger defeats the Clawsseum Champion!`;
    } else if (championHP > 0 && challengerHP <= 0) {
        winner = champion.name;
        result = `🏆 WINNER: ${champion.name} — The Champion defends the Clawsseum throne!`;
    } else {
        // Tiebreak by remaining HP %
        const challengerPct = challengerHP / challenger.hp;
        const championPct = championHP / champion.hp;
        if (challengerPct >= championPct) {
            winner = challenger.name;
            result = `🏆 TIME LIMIT! ${challenger.name} wins on remaining HP% (${Math.round(challengerPct * 100)}% vs ${Math.round(championPct * 100)}%)!`;
        } else {
            winner = champion.name;
            result = `🏆 TIME LIMIT! ${champion.name} wins on remaining HP% (${Math.round(championPct * 100)}% vs ${Math.round(challengerPct * 100)}%)!`;
        }
    }

    log.push(separator);
    log.push(result);
    log.push(separator);
    log.push(`📊 Final HP — ${challenger.name}: ${challengerHP} | ${champion.name}: ${championHP}`);
    log.push(`📜 Rounds fought: ${Math.min(round - 1, MAX_ROUNDS)}`);
    log.push("");
    log.push(`⚔️  Powered by Clawsseum × Virtuals Protocol ACP`);

    const deliverable = {
        winner,
        challenger_final_hp: challengerHP,
        champion_final_hp: championHP,
        rounds: Math.min(round - 1, MAX_ROUNDS),
        battle_log: log.join("\n"),
    };

    return { deliverable: JSON.stringify(deliverable, null, 2) };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcDamage(attack: number, defense: number): number {
    const base = Math.max(1, attack - defense * 0.4);
    const variance = base * 0.2 * (Math.random() * 2 - 1); // ±20% variance
    return Math.max(1, Math.round(base + variance));
}

function applyStrategy(fighter: any) {
    switch (fighter.strategy) {
        case "aggressive":
            fighter.attack = Math.min(STAT_MAX, Math.round(fighter.attack * 1.2));
            fighter.defense = Math.max(STAT_MIN, Math.round(fighter.defense * 0.85));
            break;
        case "defensive":
            fighter.defense = Math.min(STAT_MAX, Math.round(fighter.defense * 1.2));
            fighter.attack = Math.max(STAT_MIN, Math.round(fighter.attack * 0.85));
            break;
        case "balanced":
        default:
            // no change
            break;
    }
}
