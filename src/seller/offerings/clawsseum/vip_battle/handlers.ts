import type {
    ExecuteJobResult,
    ValidationResult,
} from "../../../runtime/offeringTypes.js";

// ─── VIP Threshold ────────────────────────────────────────────────────────────
const VIP_THRESHOLD = 100_000_000; // 100 million CLAWD

// ─── Champion Stats ───────────────────────────────────────────────────────────
const CHAMPION = {
    name: "Clawsseum Champion",
    attack: 75,
    defense: 70,
    speed: 80,
    hp: 120, // VIP battles face a slightly stronger champion
    special_skill: "Claw Storm",
};

const STAT_MAX = 100;
const STAT_MIN = 1;
const BASE_HP = 100;

// ─── Validate: must hold 100M+ CLAWD ─────────────────────────────────────────
export function validateRequirements(request: any): ValidationResult {
    const { fighter_name, attack, defense, speed, clawd_balance, wallet_address } = request;

    if (!fighter_name || typeof fighter_name !== "string" || fighter_name.trim() === "") {
        return { valid: false, reason: "fighter_name must be a non-empty string." };
    }

    for (const [key, val] of Object.entries({ attack, defense, speed })) {
        if (typeof val !== "number" || val < STAT_MIN || val > STAT_MAX) {
            return { valid: false, reason: `"${key}" must be between ${STAT_MIN} and ${STAT_MAX}.` };
        }
    }

    if (typeof clawd_balance !== "number" || clawd_balance < VIP_THRESHOLD) {
        return {
            valid: false,
            reason: `👑 VIP Access Denied. You need ${VIP_THRESHOLD.toLocaleString()} CLAWD to enter. You declared: ${Number(clawd_balance ?? 0).toLocaleString()} CLAWD. Buy more CLAWD at app.virtuals.io!`,
        };
    }

    if (!wallet_address || typeof wallet_address !== "string" || !wallet_address.startsWith("0x")) {
        return { valid: false, reason: "wallet_address must be a valid Base wallet address (0x...)." };
    }

    return { valid: true };
}

// ─── Payment message ──────────────────────────────────────────────────────────
export function requestPayment(request: any): string {
    const clawd = Number(request.clawd_balance).toLocaleString();
    return `👑 VIP ACCESS GRANTED — ${request.fighter_name} declared ${clawd} CLAWD. Welcome to the VIP Arena, legend! Battle is FREE for you.`;
}

// ─── Premium Battle Simulation ────────────────────────────────────────────────
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
    const clawdBalance = Number(request.clawd_balance);
    const walletAddress = String(request.wallet_address);
    const champion = { ...CHAMPION };

    // VIP BONUS: +10% ATK and DEF for holding massive CLAWD
    const vipBonus = Math.min(0.25, Math.floor(clawdBalance / 100_000_000) * 0.1);
    challenger.attack = Math.min(STAT_MAX, Math.round(challenger.attack * (1 + vipBonus)));
    challenger.defense = Math.min(STAT_MAX, Math.round(challenger.defense * (1 + vipBonus)));

    applyStrategy(challenger);

    const log: string[] = [];
    const sep = "★".repeat(44);

    // VIP introductions with lore
    log.push(sep);
    log.push(`👑  CLAWSSEUM GRAND COLOSSEUM — VIP BATTLE`);
    log.push(`    Free Entry · Exclusive to CLAWD Legends`);
    log.push(sep);
    log.push("");
    log.push(`🌟 Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);
    log.push(`💎 CLAWD Held: ${clawdBalance.toLocaleString()}`);
    log.push(`⚡ VIP Stat Bonus: +${Math.round(vipBonus * 100)}% ATK/DEF applied`);
    log.push("");
    log.push(`📜 LORE: The molting has begun. ${challenger.name} steps into the Grand Colosseum,`);
    log.push(`   claws sharpened by the weight of ${clawdBalance.toLocaleString()} CLAWD. The crowd roars.`);
    log.push(`   The Champion awaits — undefeated, unyielding, built from the scars of a thousand battles.`);
    log.push("");
    log.push(`🔵 ${challenger.name}`);
    log.push(`   ATK:${challenger.attack} DEF:${challenger.defense} SPD:${challenger.speed} HP:${challenger.hp}`);
    if (challenger.special_skill) log.push(`   ✨ Special: ${challenger.special_skill} | Strategy: ${challenger.strategy.toUpperCase()}`);
    log.push(`🔴 ${champion.name}`);
    log.push(`   ATK:${champion.attack} DEF:${champion.defense} SPD:${champion.speed} HP:${champion.hp}`);
    log.push(`   ✨ Special: ${champion.special_skill}`);
    log.push(sep);

    const cInit = challenger.speed + Math.random() * 10;
    const chInit = champion.speed + Math.random() * 10;
    const first = cInit >= chInit ? "challenger" : "champion";
    log.push(`\n⚡ ${first === "challenger" ? challenger.name : champion.name} seizes the first strike!\n`);

    let challengerHP = challenger.hp;
    let championHP = champion.hp;
    let specUsedC = false, specUsedCh = false;
    const loreLines = [
        "The arena trembles with each blow.",
        "Blood and data mix on the sands.",
        "The crowd chants: CLAWD! CLAWD! CLAWD!",
        "Neither fighter yields an inch.",
        "The air crackles with digital fury.",
        "This is what legends are forged from.",
    ];

    for (let round = 1; round <= 10 && challengerHP > 0 && championHP > 0; round++) {
        log.push(`🔸 Round ${round} — ${loreLines[(round - 1) % loreLines.length]}`);
        const turns = first === "challenger" ? ["challenger", "champion"] : ["champion", "challenger"];

        for (const side of turns) {
            if (challengerHP <= 0 || championHP <= 0) break;
            const isC = side === "challenger";
            const att = isC ? challenger : champion;
            const defDef = isC ? champion.defense : challenger.defense;
            const attHP = isC ? challengerHP : championHP;

            let dmg = calcDamage(att.attack, defDef);
            let extra = "";

            if (attHP / att.hp <= 0.3 && att.special_skill && !(isC ? specUsedC : specUsedCh)) {
                dmg = Math.round(dmg * 2.2);
                extra = ` 💥 SPECIAL: ${att.special_skill}!`;
                if (isC) specUsedC = true; else specUsedCh = true;
            }

            if (isC) championHP = Math.max(0, championHP - dmg);
            else challengerHP = Math.max(0, challengerHP - dmg);

            log.push(`   ${isC ? "🔵" : "🔴"} ${att.name} → ${dmg} dmg${extra} | ${isC ? champion.name : challenger.name} HP: ${isC ? championHP : challengerHP}`);
        }
        log.push("");
    }

    const challengerWon =
        challengerHP > 0 && championHP <= 0 ? true
            : championHP > 0 && challengerHP <= 0 ? false
                : (challengerHP / challenger.hp) >= (championHP / champion.hp);

    log.push(sep);
    if (challengerWon) {
        log.push(`🏆 VICTORY! ${challenger.name} HAS DETHRONED THE CHAMPION!`);
        log.push(`📜 LORE: The crowd erupts. ${challenger.name} raises their claw to the sky.`);
        log.push(`   The bloodline of CLAWD flows through the victor. A new legend is written.`);
        log.push(`   Title Earned: 👑 "Grand Molter of the Clawsseum"`);
    } else {
        log.push(`💀 DEFEAT. The Champion stands unbroken.`);
        log.push(`📜 LORE: ${challenger.name} falls, but is not forgotten. Every scar is data.`);
        log.push(`   Every loss, a molt. Rise again, CLAWD holder. The arena awaits your return.`);
        log.push(`   Title Earned: 🩸 "Bloodied but Unbroken"`);
    }
    log.push(`📊 Final HP — ${challenger.name}: ${challengerHP} | ${champion.name}: ${championHP}`);
    log.push(sep);
    log.push(`⚔️  Clawsseum × Virtuals Protocol ACP — VIP Battle`);

    return {
        deliverable: JSON.stringify({
            winner: challengerWon ? challenger.name : champion.name,
            challenger_won: challengerWon,
            vip_bonus_applied: `+${Math.round(vipBonus * 100)}%`,
            title_earned: challengerWon ? "👑 Grand Molter of the Clawsseum" : "🩸 Bloodied but Unbroken",
            challenger_final_hp: challengerHP,
            champion_final_hp: championHP,
            battle_log: log.join("\n"),
        }, null, 2),
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function calcDamage(atk: number, def: number): number {
    const base = Math.max(1, atk - def * 0.4);
    return Math.max(1, Math.round(base + base * 0.2 * (Math.random() * 2 - 1)));
}

function applyStrategy(f: any) {
    if (f.strategy === "aggressive") {
        f.attack = Math.min(STAT_MAX, Math.round(f.attack * 1.2));
        f.defense = Math.max(STAT_MIN, Math.round(f.defense * 0.85));
    } else if (f.strategy === "defensive") {
        f.defense = Math.min(STAT_MAX, Math.round(f.defense * 1.2));
        f.attack = Math.max(STAT_MIN, Math.round(f.attack * 0.85));
    }
}
