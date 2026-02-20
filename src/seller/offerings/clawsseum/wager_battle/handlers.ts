import type {
    ExecuteJobResult,
    ValidationResult,
} from "../../../runtime/offeringTypes.js";

// ─── CLAWD Token Config ───────────────────────────────────────────────────────
const CLAWD_TOKEN_ADDRESS = "0xA5c57BC3e7Fa624Ee28211e4E542823D9e2A355E";
const CLAWSSEUM_WALLET = "0x8725f5479322e952f63b9611FED6ef36B61E4e02";
const MIN_WAGER = 1000;
const WIN_MULTIPLIER = 1.9; // winner gets 1.9x their wager back

// ─── Champion Stats ───────────────────────────────────────────────────────────
const CHAMPION = {
    name: "Clawsseum Champion",
    attack: 75,
    defense: 70,
    speed: 80,
    hp: 100,
    special_skill: "Claw Storm",
};

const STAT_MAX = 100;
const STAT_MIN = 1;
const BASE_HP = 100;

// ─── Validate ────────────────────────────────────────────────────────────────
export function validateRequirements(request: any): ValidationResult {
    const { fighter_name, attack, defense, speed, wager_amount } = request;

    if (!fighter_name || typeof fighter_name !== "string" || fighter_name.trim() === "") {
        return { valid: false, reason: "fighter_name must be a non-empty string." };
    }

    for (const [key, val] of Object.entries({ attack, defense, speed })) {
        if (typeof val !== "number" || val < STAT_MIN || val > STAT_MAX) {
            return { valid: false, reason: `"${key}" must be between ${STAT_MIN} and ${STAT_MAX}. Got: ${val}` };
        }
    }

    if (typeof wager_amount !== "number" || wager_amount < MIN_WAGER) {
        return {
            valid: false,
            reason: `Minimum wager is ${MIN_WAGER.toLocaleString()} CLAWD. Got: ${wager_amount}`,
        };
    }

    return { valid: true };
}

// ─── Request payment message ─────────────────────────────────────────────────
export function requestPayment(request: any): string {
    return `⚔️💰 Wager Battle accepted! ${request.fighter_name} risks ${Number(request.wager_amount).toLocaleString()} CLAWD. Transfer CLAWD to enter the arena!`;
}

// ─── Request CLAWD transfer from buyer ───────────────────────────────────────
export function requestAdditionalFunds(request: any): {
    content?: string;
    amount: number;
    tokenAddress: string;
    recipient: string;
} {
    return {
        content: `Transfer ${Number(request.wager_amount).toLocaleString()} CLAWD as your battle wager. WIN = get ${WIN_MULTIPLIER}× back. LOSE = stake forfeited.`,
        amount: Number(request.wager_amount),
        tokenAddress: CLAWD_TOKEN_ADDRESS,
        recipient: CLAWSSEUM_WALLET,
    };
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
    const wagerAmount = Number(request.wager_amount);
    const champion = { ...CHAMPION };
    const log: string[] = [];
    const sep = "═".repeat(44);

    applyStrategy(challenger);

    log.push(`🏟️  CLAWSSEUM WAGER BATTLE`);
    log.push(`💰 Wager: ${wagerAmount.toLocaleString()} CLAWD`);
    log.push(`🏆 Prize Pool (if you win): ${Math.floor(wagerAmount * WIN_MULTIPLIER).toLocaleString()} CLAWD`);
    log.push(sep);
    log.push(`🔵 ${challenger.name}  ATK:${challenger.attack} DEF:${challenger.defense} SPD:${challenger.speed} HP:${challenger.hp}`);
    if (challenger.special_skill) log.push(`   ✨ Special: ${challenger.special_skill} | Strategy: ${challenger.strategy.toUpperCase()}`);
    log.push(`🔴 ${champion.name}    ATK:${champion.attack} DEF:${champion.defense} SPD:${champion.speed} HP:${champion.hp}`);
    log.push(`   ✨ Special: ${champion.special_skill}`);
    log.push(sep);

    // Initiative roll
    const cInit = challenger.speed + Math.random() * 10;
    const chInit = champion.speed + Math.random() * 10;
    const first = cInit >= chInit ? "challenger" : "champion";
    log.push(`\n⚡ ${first === "challenger" ? challenger.name : champion.name} strikes first!\n`);

    let challengerHP = challenger.hp;
    let championHP = champion.hp;
    let specialUsedChallenger = false;
    let specialUsedChampion = false;

    for (let round = 1; round <= 10 && challengerHP > 0 && championHP > 0; round++) {
        log.push(`🔸 Round ${round}`);
        const turns = first === "challenger"
            ? ["challenger", "champion"]
            : ["champion", "challenger"];

        for (const side of turns) {
            if (challengerHP <= 0 || championHP <= 0) break;
            const isChallenger = side === "challenger";
            const attacker = isChallenger ? challenger : champion;
            const defDef = isChallenger ? champion.defense : challenger.defense;
            const attackerHP = isChallenger ? challengerHP : championHP;

            let dmg = calcDamage(attacker.attack, defDef);
            let extra = "";

            if (
                attackerHP / attacker.hp <= 0.3 &&
                attacker.special_skill &&
                !(isChallenger ? specialUsedChallenger : specialUsedChampion)
            ) {
                dmg = Math.round(dmg * 2.2);
                extra = ` 💥 SPECIAL: ${attacker.special_skill}!`;
                if (isChallenger) specialUsedChallenger = true;
                else specialUsedChampion = true;
            }

            if (isChallenger) championHP = Math.max(0, championHP - dmg);
            else challengerHP = Math.max(0, challengerHP - dmg);

            log.push(
                `   ${isChallenger ? "🔵" : "🔴"} ${attacker.name} → ${dmg} dmg${extra}` +
                ` | ${isChallenger ? champion.name : challenger.name} HP: ${isChallenger ? championHP : challengerHP}`
            );
        }
        log.push("");
    }

    // Determine winner
    const challengerWon =
        challengerHP > 0 && championHP <= 0
            ? true
            : championHP > 0 && challengerHP <= 0
                ? false
                : (challengerHP / challenger.hp) >= (championHP / champion.hp);

    const winnerName = challengerWon ? challenger.name : champion.name;
    const rewardCLAWD = challengerWon ? Math.floor(wagerAmount * WIN_MULTIPLIER) : 0;

    log.push(sep);
    log.push(`🏆 WINNER: ${winnerName}`);
    log.push(challengerWon
        ? `💰 ${challenger.name} wins! ${rewardCLAWD.toLocaleString()} CLAWD will be returned to your wallet.`
        : `💀 ${challenger.name} lost! ${wagerAmount.toLocaleString()} CLAWD goes to the Clawsseum treasury.`);
    log.push(`📊 Final HP — ${challenger.name}: ${challengerHP} | ${champion.name}: ${championHP}`);
    log.push("⚔️  Powered by Clawsseum × Virtuals Protocol ACP");

    // Build result — if challenger wins, return CLAWD via payableDetail
    const result: ExecuteJobResult = {
        deliverable: JSON.stringify({
            winner: winnerName,
            challenger_won: challengerWon,
            wager_amount: wagerAmount,
            clawd_returned: rewardCLAWD,
            challenger_final_hp: challengerHP,
            champion_final_hp: championHP,
            battle_log: log.join("\n"),
        }, null, 2),
    };

    if (challengerWon && rewardCLAWD > 0) {
        (result as any).payableDetail = {
            amount: rewardCLAWD,
            tokenAddress: CLAWD_TOKEN_ADDRESS,
            recipient: request.buyer_wallet ?? CLAWSSEUM_WALLET,
        };
    }

    return result;
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
