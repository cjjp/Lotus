﻿import { shuffleArray } from "./shuffle"

const radModelBias = {
  135: -1,
  113: -1,
  18: 1,
  93: 1,
  14: 1,
  86: 1,
  70: 1,
  55: 1,
  42: 1,
  21: 2,
  78: 2,
  16: 2,
  63: 2.5,
  4: 2.5,
  36: 3,
  82: 3,
  112: 4.5,
};//winrate biases by side, supplied by noxville


export function balanceByWinrate(roster, byAttribute, byAttackCapability) {
  const mapped = roster.map((x) => ({ key: (byAttackCapability ? x.hero.attack_capabilities : "") + (byAttribute ? x.hero.primary_attribute : ""), value: x }))
  const rad = mapped.filter((x) => x.value.team == 1)
  //since the generator will give a roster with roughly even capability/attributes we can sort the teams and match them, giving more valid combinations for tryCombinations
  const dire = matchRightToKeysOnLeft(rad, mapped.filter((x) => x.value.team == 2))
  const combs = [0, 1, 2, 3, 4].map((i) => [rad[i].value, dire[i].value])
  var balancedRosterPairs = tryCombinations(combs, [...roster.filter((x) => x.team == 3)], byAttribute, byAttackCapability).roster

  //shuffle again and get them back in the team order for the rest of the site
  var nonReserve = [
    ...shuffleArray(balancedRosterPairs.map((x) => {
      x[0].team = 1;
      return x[0];
    })),
    ...shuffleArray(balancedRosterPairs.map((x) => {
      x[1].team = 2;
      return x[1];
    })),
  ]
  var reserve = roster.filter((a) => nonReserve.map((r) => r.hero.id).indexOf(a.hero.id) < 0)
  reserve.forEach((a) => (a.team = 3))
  var newRoster = [...nonReserve, ...reserve]
  return newRoster;
}

export function tryCombinations(list, adds, byAttribute, byAttackCapability, n = 0, used = [], current = [], best = { roster: [], min: 1000 }) {
  if (n === list.length) {
    const draftBalanceRating = getDraftBalanceRating(current, byAttribute, byAttackCapability)
    if (draftBalanceRating < best.min) {
      best.roster = current
      best.min = draftBalanceRating
    }
  } else {
    var vals = [...list[n], ...adds.filter((a) => !used[a.hero.id])]
    var addCombinations = vals.flatMap((a) => vals.filter((b) => a != b).map((b) => [a, b]))
    addCombinations.forEach((item) => {
      var newUsed = [...used]
      newUsed[item[0].hero.id] = 1
      newUsed[item[1].hero.id] = 1
      tryCombinations(list, adds, byAttribute, byAttackCapability, n + 1, newUsed, [...current, item], best)
    })
  }

  return best
}

function getDraftBalanceRating(roster, byAttribute, byAttackCapability) {
  const radiantWin = roster.reduce((c, x) => c + x[0].hero.win_rate + (radModelBias[x[0].hero.id] ?? 0), 0)
  const direAttr = [...new Set(roster.map((x) => x[1].hero.primary_attribute))]
  const radAttr = [...new Set(roster.map((x) => x[0].hero.primary_attribute))]
  const direTypes = [...new Set(roster.map((x) => x[1].hero.attack_capabilities))]
  const radTypes = [...new Set(roster.map((x) => x[0].hero.attack_capabilities))]
  const direWin = roster.reduce((c, x) => c + x[1].hero.win_rate - (radModelBias[x[0].hero.id] ?? 0), 0)
  const attackRangeDiff = Math.abs(roster.reduce((c, x) => c + x[1].hero.attack_range, 0) - roster.reduce((c, x) => c + x[0].hero.attack_range, 0))
  const rangeImbalance = attackRangeDiff < 300 ? 0 : attackRangeDiff < 500 ? 0.02 : attackRangeDiff < 700 ? 0.05 : 0.1
  const modifiers =
    (byAttribute ? Math.abs(direAttr.filter((x) => !radAttr.includes(x)).concat(radAttr.filter((x) => !direAttr.includes(x))).length) * 0.05 : 0) +
    (byAttackCapability ? Math.abs(direTypes.filter((x) => !radTypes.includes(x)).concat(radTypes.filter((x) => !direTypes.includes(x))).length) * 0.05 : 0) +
    (byAttackCapability ? rangeImbalance : 0)

  return Math.abs(radiantWin - direWin) + modifiers
}

export function matchRightToKeysOnLeft(left, right) {
  let newRight = new Array(left.length);
  let alreadyPaired = new Array(left.length);
  right.forEach((r) => {
    var ind = left.findIndex((l, i) => l.key == r.key && !alreadyPaired[i])
    if (ind != -1) {
      alreadyPaired[ind] = true;
      newRight[ind] = r;
    }
  });

  [0,1,2,3,4].forEach((i) => {
    if (!newRight[i]) {
      newRight[i] = right.find(r2 => !newRight.includes(r2));
    }
  });
  return newRight;
}