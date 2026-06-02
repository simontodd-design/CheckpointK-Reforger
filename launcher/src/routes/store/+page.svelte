<script lang="ts">
  // Static for v1. When Stripe wires up, this fetches from /store/catalog.
  // No real-money currency, no pay-to-win — boosts capped at +15%.

  type Tier = {
    id: 'bronze' | 'silver' | 'gold';
    name: string;
    months: number;
    priceGbp: number;
    xpBoost: number;
    scripBoost: number;
    lootBoost: number;
    perks: string[];
    featured?: boolean;
  };

  const tiers: Tier[] = [
    {
      id: 'bronze', name: 'Bronze', months: 1, priceGbp: 4.99,
      xpBoost: 5, scripBoost: 5, lootBoost: 5,
      perks: ['Bronze flair in chat', 'Priority queue', 'Monthly supply drop'],
    },
    {
      id: 'silver', name: 'Silver', months: 6, priceGbp: 24.99,
      xpBoost: 10, scripBoost: 10, lootBoost: 10,
      perks: ['Silver chat flair', 'Priority queue', 'Monthly supply drop', '1 character slot'],
      featured: true,
    },
    {
      id: 'gold', name: 'Gold', months: 12, priceGbp: 44.99,
      xpBoost: 15, scripBoost: 15, lootBoost: 15,
      perks: ['Gold flair', 'Priority queue', 'Monthly supply drop', '2 character slots', 'Beta access'],
    },
  ];

  type Bag = {
    id: string;
    name: string;
    priceGbp: number;
    description: string;
    odds: { rarity: string; pct: number; color: string }[];
  };

  const bags: Bag[] = [
    {
      id: 'medic-bag', name: 'Field Medic Bag', priceGbp: 1.99,
      description: 'Medical kit, antibiotics, blood bags. One random item.',
      odds: [
        { rarity: 'Common', pct: 60, color: '#5fa0bc' },
        { rarity: 'Uncommon', pct: 30, color: '#4fcfdf' },
        { rarity: 'Rare', pct: 10, color: '#c9a570' },
      ],
    },
    {
      id: 'ak-bag', name: 'AK Loadout Bag', priceGbp: 4.99,
      description: 'AK-family rifle + ammo. Roll for variant.',
      odds: [
        { rarity: 'AKM (Common)', pct: 50, color: '#5fa0bc' },
        { rarity: 'AKS-74U (Uncommon)', pct: 35, color: '#4fcfdf' },
        { rarity: 'AK-103 (Rare)', pct: 12, color: '#c9a570' },
        { rarity: 'Gilded AK (Cosmetic)', pct: 3, color: '#c97b70' },
      ],
    },
    {
      id: 'survivor-bag', name: 'Survivor Bag', priceGbp: 2.99,
      description: 'Clothing, food, water. Outfits and rations.',
      odds: [
        { rarity: 'Common', pct: 65, color: '#5fa0bc' },
        { rarity: 'Uncommon', pct: 25, color: '#4fcfdf' },
        { rarity: 'Rare cosmetic', pct: 10, color: '#c9a570' },
      ],
    },
  ];
</script>

<div class="page">
  <header class="page-header">
    <p class="eyebrow">Quartermaster</p>
    <h1 class="display">Store.</h1>
    <p class="sub">Subscriptions, bags. Items are soulbound — no trading, no cash-out.</p>
  </header>

  <section class="section">
    <h2 class="section-title">Subscriptions</h2>
    <div class="tier-grid">
      {#each tiers as tier (tier.id)}
        <div class="tier tier-{tier.id}" class:featured={tier.featured}>
          {#if tier.featured}<span class="badge">Best value</span>{/if}
          <h3 class="tier-name">{tier.name}</h3>
          <p class="tier-duration">{tier.months} {tier.months === 1 ? 'month' : 'months'}</p>
          <div class="tier-price">
            <span class="currency">£</span><span class="amount">{tier.priceGbp.toFixed(2)}</span>
          </div>
          <div class="boosts">
            <div class="boost"><span>+{tier.xpBoost}%</span><label>XP</label></div>
            <div class="boost"><span>+{tier.scripBoost}%</span><label>Scrip</label></div>
            <div class="boost"><span>+{tier.lootBoost}%</span><label>Loot</label></div>
          </div>
          <ul class="perks">
            {#each tier.perks as perk (perk)}<li>{perk}</li>{/each}
          </ul>
          <button class="tier-cta" type="button" disabled>Subscribe</button>
        </div>
      {/each}
    </div>
    <p class="footnote">
      Boosts stack to a hard +15% ceiling. Subscriptions never grant items —
      only multipliers on play.
    </p>
  </section>

  <section class="section">
    <h2 class="section-title">Supply bags</h2>
    <p class="section-sub">Transparent odds. Items roll on open and bind to your character.</p>
    <div class="bag-grid">
      {#each bags as bag (bag.id)}
        <div class="bag">
          <div class="bag-head">
            <h3 class="bag-name">{bag.name}</h3>
            <div class="bag-price">£{bag.priceGbp.toFixed(2)}</div>
          </div>
          <p class="bag-desc">{bag.description}</p>
          <div class="bag-odds">
            <p class="odds-label">Drop rates</p>
            {#each bag.odds as o (o.rarity)}
              <div class="odd-row">
                <span class="odd-name" style:color={o.color}>{o.rarity}</span>
                <span class="odd-bar">
                  <span class="odd-fill" style:width="{o.pct}%" style:background={o.color}></span>
                </span>
                <span class="odd-pct">{o.pct}%</span>
              </div>
            {/each}
          </div>
          <button class="bag-cta" type="button" disabled>Purchase</button>
        </div>
      {/each}
    </div>
    <p class="footnote">
      Belgium not available. Age 18+ required at checkout. Each bag's odds
      are audited and unchanged once published.
    </p>
  </section>
</div>

<style>
  .page { padding: 48px 56px 80px; max-width: 1280px; }
  .page-header { margin-bottom: 40px; }
  .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #4fcfdf;
    margin: 0 0 12px;
  }
  .display {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 32px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0 0 8px;
    color: #f4fafc;
  }
  .sub { font-size: 13px; color: #5fa0bc; font-style: italic; margin: 0; }

  .section { margin-bottom: 48px; }
  .section-title {
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5fa0bc;
    margin: 0 0 6px;
    font-weight: 500;
  }
  .section-sub {
    font-size: 12px;
    color: #5fa0bc;
    margin: 0 0 18px;
    font-style: italic;
  }

  /* tiers */
  .tier-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
  }
  .tier {
    position: relative;
    padding: 28px 24px;
    background: rgba(10, 14, 19, 0.5);
    border: 1px solid #1e3d4f;
    display: flex;
    flex-direction: column;
  }
  .tier.featured {
    border-color: #4fcfdf;
    box-shadow: 0 0 32px rgba(79, 207, 223, 0.08);
  }
  .tier-bronze { border-top: 2px solid #b87f4a; }
  .tier-silver { border-top: 2px solid #b9deeb; }
  .tier-gold   { border-top: 2px solid #c9a570; }
  .badge {
    position: absolute;
    top: -10px;
    right: 20px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 4px 8px;
    background: #4fcfdf;
    color: #05080b;
  }
  .tier-name {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 24px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0 0 4px;
    color: #f4fafc;
  }
  .tier-duration {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #5fa0bc;
    letter-spacing: 0.1em;
    margin: 0 0 18px;
  }
  .tier-price {
    display: flex;
    align-items: baseline;
    gap: 2px;
    margin-bottom: 24px;
  }
  .currency { font-size: 16px; color: #5fa0bc; }
  .amount {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 36px;
    color: #f4fafc;
    line-height: 1;
  }
  .boosts {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    padding: 12px;
    background: rgba(79, 207, 223, 0.05);
    border: 1px solid #1e3d4f;
  }
  .boost {
    flex: 1;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .boost span {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    color: #4fcfdf;
    font-weight: 600;
  }
  .boost label {
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5fa0bc;
  }
  .perks {
    list-style: none;
    padding: 0;
    margin: 0 0 24px;
    font-size: 12px;
    color: #b9deeb;
    flex: 1;
  }
  .perks li {
    padding: 6px 0;
    border-bottom: 1px solid #1e3d4f;
    line-height: 1.4;
  }
  .perks li:last-child { border-bottom: none; }
  .tier-cta {
    padding: 12px 20px;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    border: 1px solid #9dd0e8;
    color: #f4fafc;
    background: rgba(157, 208, 232, 0.08);
    cursor: pointer;
    font-weight: 500;
  }
  .tier-cta:disabled { opacity: 0.5; cursor: not-allowed; }
  .tier-cta:hover:not(:disabled) {
    border-color: #4fcfdf;
    background: rgba(79, 207, 223, 0.16);
  }

  /* bags */
  .bag-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
  }
  .bag {
    padding: 24px;
    background: rgba(10, 14, 19, 0.5);
    border: 1px solid #1e3d4f;
    display: flex;
    flex-direction: column;
  }
  .bag-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
  }
  .bag-name {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 17px;
    font-weight: 500;
    letter-spacing: 0.03em;
    margin: 0;
    color: #f4fafc;
  }
  .bag-price {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    color: #4fcfdf;
  }
  .bag-desc {
    font-size: 12px;
    color: #b9deeb;
    margin: 0 0 18px;
    line-height: 1.5;
  }
  .bag-odds {
    padding: 14px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #1e3d4f;
    margin-bottom: 18px;
  }
  .odds-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5fa0bc;
    margin: 0 0 10px;
  }
  .odd-row {
    display: grid;
    grid-template-columns: 1fr 80px 36px;
    gap: 8px;
    align-items: center;
    margin-bottom: 6px;
    font-size: 11px;
  }
  .odd-row:last-child { margin-bottom: 0; }
  .odd-name { color: #b9deeb; }
  .odd-bar {
    height: 4px;
    background: #1e3d4f;
    position: relative;
  }
  .odd-fill { display: block; height: 100%; }
  .odd-pct {
    font-family: 'JetBrains Mono', monospace;
    color: #5fa0bc;
    text-align: right;
  }
  .bag-cta {
    padding: 11px 16px;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid #2e5b72;
    color: #b9deeb;
    background: transparent;
    cursor: pointer;
  }
  .bag-cta:disabled { opacity: 0.5; cursor: not-allowed; }

  .footnote {
    font-size: 11px;
    color: #5fa0bc;
    margin: 16px 0 0;
    font-style: italic;
    line-height: 1.5;
  }
</style>
