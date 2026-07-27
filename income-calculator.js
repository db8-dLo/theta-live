(function () {
  if (customElements.get('income-calculator')) return;

  var STYLE = `
:host{display:block;--bg:#0A0C11;--bg2:#0D1017;--panel:#12161E;--panel2:#161B25;--line:rgba(255,255,255,.09);--line2:rgba(255,255,255,.055);--tx:#E9EDF3;--mut:#8B94A5;--mut2:#5C6473;--acc:#00AEEF;--acc-ink:#03141d;--pos:#33CE8B;--neg:#F2657A;font-family:var(--f-body,'Archivo',system-ui,-apple-system,sans-serif);color:var(--tx);line-height:1.6}
*{box-sizing:border-box;margin:0;padding:0}
.mono{font-family:var(--f-mono,'JetBrains Mono',ui-monospace,monospace)}
.acc{color:var(--acc)}.pos{color:var(--pos)}.mut{color:var(--mut)}
.calc{position:relative;border-radius:22px;overflow:hidden;border:1px solid var(--line);background:var(--panel)}
.calc-head{padding:24px clamp(20px,3vw,30px);border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:40px;align-items:flex-end;justify-content:center}
.ctl-group{display:flex;flex-direction:column;gap:9px}
.ctl-title{font-family:var(--f-mono,'JetBrains Mono',ui-monospace,monospace);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut2)}
.seg{display:inline-flex;gap:3px;background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:4px}
.seg button{font-family:var(--f-body,'Archivo',sans-serif);font-weight:600;font-size:13.5px;color:var(--mut);background:transparent;border:0;border-radius:9px;padding:9px 16px;cursor:pointer;transition:color .18s,background .18s,box-shadow .18s;white-space:nowrap}
.seg button:hover{color:var(--tx)}
.seg button[aria-selected="true"]{background:var(--panel2);color:var(--tx);box-shadow:0 2px 8px -3px rgba(0,0,0,.6),inset 0 0 0 1px var(--line)}
.calc-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr)}
@media(max-width:800px){.calc-grid{grid-template-columns:1fr}}
.inputs{padding:clamp(20px,3vw,30px);border-right:1px solid var(--line)}
@media(max-width:800px){.inputs{border-right:0;border-bottom:1px solid var(--line)}}
.sec-label{font-family:var(--f-mono,'JetBrains Mono',ui-monospace,monospace);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut2);margin-bottom:16px}
.field{margin-bottom:16px}
.field:last-child{margin-bottom:0}
.field .top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px;gap:12px}
.field label{font-size:13.5px;font-weight:600;color:var(--tx)}
.field .why{font-size:11px;color:var(--mut2);font-weight:400;text-align:right}
.numwrap{position:relative;display:flex;align-items:center}
.numwrap .pre{position:absolute;left:13px;color:var(--mut2);font-family:var(--f-mono,'JetBrains Mono',ui-monospace,monospace);font-size:15px;pointer-events:none}
.numwrap input[type="number"]{width:100%;font-family:var(--f-mono,'JetBrains Mono',ui-monospace,monospace);font-size:16px;font-weight:500;color:var(--tx);background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:12px 13px;transition:border-color .15s,box-shadow .15s;-moz-appearance:textfield}
.numwrap input.has-pre{padding-left:26px}
.numwrap input.has-suf{padding-right:34px}
.numwrap .suf{position:absolute;right:13px;color:var(--mut2);font-family:var(--f-mono,'JetBrains Mono',ui-monospace,monospace);font-size:14px;pointer-events:none}
.numwrap input[type="number"]:focus{outline:0;border-color:var(--acc);box-shadow:0 0 0 3px rgba(0,174,239,.15)}
.numwrap input::-webkit-outer-spin-button,.numwrap input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
input[type="range"]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:4px;background:var(--line);margin-top:12px;cursor:pointer}
input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;background:var(--acc);border:3px solid #0b0e14;box-shadow:0 0 0 1px var(--acc),0 4px 12px -2px rgba(0,174,239,.6);cursor:pointer}
input[type="range"]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--acc);border:3px solid #0b0e14;box-shadow:0 0 0 1px var(--acc);cursor:pointer}
.cc-note{font-size:12px;color:var(--mut2);margin-top:14px;padding-top:14px;border-top:1px solid var(--line2);display:none}
#lm[data-mode="cc"] .cc-note{display:block}
.results{padding:clamp(20px,3vw,30px);background:var(--bg2);display:flex;flex-direction:column}
.prem-line{font-family:var(--f-mono,'JetBrains Mono',ui-monospace,monospace);font-size:12px;color:var(--mut2);margin-bottom:6px}
.prem-line b{color:var(--acc);font-weight:600}
.rhead{font-size:13px;font-weight:600;color:var(--mut)}
.rbig{font-family:var(--f-mono,'JetBrains Mono',ui-monospace,monospace);font-size:clamp(42px,7.5vw,60px);font-weight:600;letter-spacing:-.02em;line-height:1;color:var(--pos);margin:6px 0 3px}
.plain{font-size:14px;color:var(--tx);opacity:.88;line-height:1.5;margin-top:8px;max-width:46ch}
.plain b{color:var(--acc);font-weight:700}
.metrics{margin-top:22px;border-top:1px solid var(--line);padding-top:4px}
.m{display:flex;justify-content:space-between;align-items:baseline;gap:14px;padding:12px 0;border-bottom:1px solid var(--line2)}
.m:last-child{border-bottom:0}
.m .k{font-size:13px;color:var(--mut);font-weight:500}
.m .k small{display:block;font-size:10.5px;color:var(--mut2);font-weight:400;margin-top:2px;max-width:34ch;line-height:1.4}
.m .v{font-family:var(--f-mono,'JetBrains Mono',ui-monospace,monospace);font-size:16.5px;font-weight:600;color:var(--tx);white-space:nowrap}
.m .v.acc{color:var(--acc)}
.annual{margin-top:14px;background:rgba(255,255,255,.02);border:1px solid var(--line2);border-radius:10px;padding:12px 14px}
.annual .top{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.annual .k{font-size:12px;color:var(--mut);font-weight:600}
.annual .v{font-family:var(--f-mono,'JetBrains Mono',ui-monospace,monospace);font-size:14.5px;font-weight:600;color:var(--mut)}
.annual .caveat{font-size:10.5px;color:var(--mut2);margin-top:5px;line-height:1.45}
.mathtoggle{margin-top:14px;font-family:var(--f-mono,'JetBrains Mono',ui-monospace,monospace);font-size:11.5px;letter-spacing:.06em;color:var(--acc);background:transparent;border:0;cursor:pointer;padding:0;display:inline-flex;align-items:center;gap:6px}
.mathbox{display:none;margin-top:10px;background:var(--bg);border:1px solid var(--line2);border-radius:10px;padding:14px;font-family:var(--f-mono,'JetBrains Mono',ui-monospace,monospace);font-size:12px;color:var(--mut);line-height:1.9}
.mathbox.open{display:block}
.mathbox .hl{color:var(--tx)}
.illus-flag{display:inline-block;font-family:var(--f-mono,'JetBrains Mono',ui-monospace,monospace);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut2);border:1px solid var(--line);border-radius:5px;padding:3px 8px;margin-top:14px;align-self:flex-start}
.disclaimer{padding:15px clamp(20px,3vw,30px);background:var(--bg);border-top:1px solid var(--line);display:flex;gap:10px;align-items:flex-start}
.disclaimer svg{flex:none;margin-top:1px}
.disclaimer p{font-size:11.5px;line-height:1.55;color:var(--mut2)}
@media(max-width:520px){
.calc-head{gap:10px;padding:16px 10px;align-items:flex-start;flex-wrap:nowrap}
.ctl-group{flex:1;gap:6px;min-width:0}
.ctl-title{font-size:8.5px;letter-spacing:.08em}
.seg{padding:3px;width:100%;gap:2px}
.seg button{padding:8px 3px;font-size:9px;flex:1;border-radius:7px;white-space:nowrap;letter-spacing:-.01em}
.inputs,.results{padding:16px 14px}
.field{margin-bottom:12px}
.rbig{font-size:clamp(34px,10vw,46px)}
}
`;

  var MARKUP = `
<div id="lm" data-mode="csp">
  <div class="calc">
    <div class="calc-head">
      <div class="ctl-group">
        <span class="ctl-title">Strategy</span>
        <div class="seg" role="tablist" aria-label="Strategy">
          <button role="tab" aria-selected="true" data-strat="csp">Cash-Secured Put</button>
          <button role="tab" aria-selected="false" data-strat="cc">Covered Call</button>
        </div>
      </div>
      <div class="ctl-group">
        <span class="ctl-title">Risk profile</span>
        <div class="seg" role="tablist" aria-label="Risk profile">
          <button role="tab" aria-selected="false" data-preset="conservative">Conservative</button>
          <button role="tab" aria-selected="true" data-preset="balanced">Balanced</button>
        </div>
      </div>
    </div>
    <div class="calc-grid">
      <div class="inputs">
        <p class="sec-label">Your numbers</p>
        <div class="field">
          <div class="top"><label for="f-stock">Stock price</label><span class="why">what it trades at now</span></div>
          <div class="numwrap"><span class="pre">$</span><input class="has-pre" type="number" id="f-stock" value="81.50" min="1" step="0.5" inputmode="decimal"></div>
          <input type="range" id="s-stock" min="10" max="400" step="0.5" value="81.50" aria-label="Stock price slider">
        </div>
        <div class="field">
          <div class="top"><label for="f-strike" id="lbl-strike">Strike price</label><span class="why" id="why-strike">the price you'd agree to buy at</span></div>
          <div class="numwrap"><span class="pre">$</span><input class="has-pre" type="number" id="f-strike" value="77.50" min="1" step="0.5" inputmode="decimal"></div>
          <input type="range" id="s-strike" min="10" max="400" step="0.5" value="77.50" aria-label="Strike price slider">
        </div>
        <div class="field">
          <div class="top"><label for="f-vol">Volatility <span class="mut" style="font-weight:400">(how much it moves)</span></label><span class="why" id="why-vol">steady blue chips ~15%, average ~25%, higher ~30%</span></div>
          <div class="numwrap"><input class="has-suf" type="number" id="f-vol" value="23" min="12" max="30" step="1" inputmode="numeric"><span class="suf">%</span></div>
          <input type="range" id="s-vol" min="12" max="30" step="1" value="23" aria-label="Volatility slider">
        </div>
        <p class="daysnote" style="margin:0 0 2px;font-size:12.5px;color:var(--mut);line-height:1.55"><b style="color:var(--tx)">Fixed at 30 days.</b> We sell options 30 days out or less at a time, because that collects premium most efficiently.</p>
        <div class="field">
          <div class="top"><label for="f-cons">Contracts</label><span class="why">1 contract = 100 shares</span></div>
          <div class="numwrap"><input type="number" id="f-cons" value="1" min="1" max="5" step="1" inputmode="numeric"></div>
          <input type="range" id="s-cons" min="1" max="5" step="1" value="1" aria-label="Contracts slider">
        </div>
        <p class="cc-note">Covered call assumes you already own <span class="mono" id="cc-shares">100</span> shares of the company.</p>
      </div>
      <div class="results">
        <div class="prem-line">Estimated premium <b id="prem-out">$0.79</b> / share</div>
        <div class="rhead" id="hero-label">You would be paid today</div>
        <div class="rbig" id="hero-value">$79</div>
        <p class="plain" id="plain"></p>
        <div class="metrics" id="metrics"></div>
        <div class="annual">
          <div class="top"><span class="k">Illustrative annualized</span><span class="v" id="annual-value">9.8%</span></div>
          <p class="caveat">A hypothetical figure that assumes the same result is repeated every period. It is not a projection or a promise, and it ignores the stretches where a trade is assigned or underwater. Real results vary and can include loss.</p>
        </div>
        <button class="mathtoggle" id="mathtoggle" aria-expanded="false">▸ Show the math</button>
        <div class="mathbox" id="mathbox"></div>
        <span class="illus-flag">Illustrative example · not a recommendation</span>
      </div>
    </div>
    <div class="disclaimer">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#5C6473" stroke-width="1.6"/><path d="M12 8v5" stroke="#5C6473" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16.3" r="1.05" fill="#5C6473"/></svg>
      <p>Illustrative and educational only. The premium is a theoretical estimate from a standard options model (Black-Scholes), not a live price, a quote, or a prediction. It excludes dividends and fees, and actual premiums vary. Not a recommendation to buy, sell, or hold any security. Options involve risk, including loss.</p>
    </div>
  </div>
</div>
`;

  class IncomeCalculator extends HTMLElement {
    connectedCallback() {
      if (this._mounted) return;
      this._mounted = true;
      var sr = this.attachShadow({ mode: 'open' });
      sr.innerHTML = '<style>' + STYLE + '</style>' + MARKUP;
      this._init(sr);
    }

    _init(root) {
      var $ = function (id) { return root.getElementById(id); };
      var lm = $('lm');
      var mode = 'csp';
      var num = { stock: $('f-stock'), strike: $('f-strike'), vol: $('f-vol'), cons: $('f-cons') };
      var sld = { stock: $('s-stock'), strike: $('s-strike'), vol: $('s-vol'), cons: $('s-cons') };
      var out = {
        heroLabel: $('hero-label'), heroValue: $('hero-value'), plain: $('plain'), premOut: $('prem-out'),
        metrics: $('metrics'), annual: $('annual-value'), ccShares: $('cc-shares'),
        mathbox: $('mathbox'), lblStrike: $('lbl-strike'), whyStrike: $('why-strike')
      };
      var RATE = 0.04;

      function normCDF(x) {
        var b1 = 0.319381530, b2 = -0.356563782, b3 = 1.781477937, b4 = -1.821255978, b5 = 1.330274429, p = 0.2316419, c = 0.39894228, t;
        if (x >= 0) { t = 1 / (1 + p * x); return 1 - c * Math.exp(-x * x / 2) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1); }
        t = 1 / (1 - p * x); return c * Math.exp(-x * x / 2) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
      }
      function bsPrice(type, S, K, T, sig, r) {
        if (T <= 0 || sig <= 0 || S <= 0 || K <= 0) return 0;
        var sq = Math.sqrt(T), d1 = (Math.log(S / K) + (r + sig * sig / 2) * T) / (sig * sq), d2 = d1 - sig * sq, disc = Math.exp(-r * T);
        return type === 'call' ? S * normCDF(d1) - K * disc * normCDF(d2) : K * disc * normCDF(-d2) - S * normCDF(-d1);
      }

      var PRESETS = {
        csp: {
          conservative: { stock: 81.50, strike: 75, vol: 21, days: 38, cons: 1 },
          balanced: { stock: 81.50, strike: 77.50, vol: 23, days: 38, cons: 1 }
        },
        cc: {
          conservative: { stock: 266, strike: 285, vol: 15, days: 35, cons: 1 },
          balanced: { stock: 266, strike: 280, vol: 16, days: 35, cons: 1 }
        }
      };

      function money(n) { return isFinite(n) ? '$' + Math.round(n).toLocaleString('en-US') : '$0'; }
      function money2(n) { return isFinite(n) ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'; }
      function pct(n) { return isFinite(n) ? (n >= 0 ? '' : '-') + Math.abs(n).toFixed(1) + '%' : '—'; }
      function v(el) { var x = parseFloat(el.value); return isFinite(x) ? x : 0; }
      function rowHTML(k, val, sub, accent) {
        return '<div class="m"><span class="k">' + k + (sub ? '<small>' + sub + '</small>' : '') + '</span><span class="v' + (accent ? ' acc' : '') + '">' + val + '</span></div>';
      }

      function updateStrikeBounds() {
        var stock = v(num.stock), lo, hi;
        if (mode === 'csp') { lo = Math.round(stock * 0.85); hi = Math.round(stock * 0.96); }
        else { lo = Math.round(stock * 1.04); hi = Math.round(stock * 1.15); }
        lo = Math.max(1, lo); hi = Math.max(lo + 1, hi);
        num.strike.min = lo; num.strike.max = hi;
        if (sld.strike) { sld.strike.min = lo; sld.strike.max = hi; }
        var s = v(num.strike);
        if (s < lo) s = lo; else if (s > hi) s = hi;
        num.strike.value = s; if (sld.strike) sld.strike.value = s;
      }

      var animTarget = 0, animCur = 0, animRAF = null;
      function animateHero(to) {
        animTarget = to;
        if (animRAF) return;
        function tick() {
          var diff = animTarget - animCur;
          if (Math.abs(diff) < 0.5) { animCur = animTarget; out.heroValue.textContent = money(animCur); animRAF = null; return; }
          animCur += diff * 0.18;
          out.heroValue.textContent = money(animCur);
          animRAF = requestAnimationFrame(tick);
        }
        animRAF = requestAnimationFrame(tick);
      }

      function calc() {
        var stock = v(num.stock), strike = v(num.strike), sig = Math.max(0, v(num.vol)) / 100,
          days = 30, daysOK = true, cons = Math.max(1, v(num.cons)), shares = cons * 100;
        var T = days / 365;
        var prem = Math.max(0, Math.round(bsPrice(mode === 'csp' ? 'put' : 'call', stock, strike, T, sig, RATE) * 100) / 100);
        out.premOut.textContent = money2(prem);
        out.ccShares.textContent = shares.toLocaleString('en-US');

        var incomeToday = prem * shares;
        var rows = '', annual = '—', math = '';

        if (mode === 'csp') {
          var capital = strike * shares,
            periodRet = strike ? prem / strike * 100 : NaN,
            annualRet = (strike && daysOK) ? (prem / strike) * (365 / days) * 100 : NaN,
            buyPrice = strike - prem,
            discount = stock ? ((stock - buyPrice) / stock) * 100 : NaN;
          out.heroLabel.textContent = 'You would be paid today';
          rows += rowHTML('Cash set aside', money(capital), 'held to buy the shares if assigned');
          rows += rowHTML('Return for the period', pct(periodRet), 'on the cash set aside', true);
          rows += rowHTML('Your buy price if assigned', money2(buyPrice), 'the strike minus the premium you kept');
          rows += rowHTML('Discount vs. today', pct(discount), 'on a stock you wanted anyway');
          annual = pct(annualRet);
          out.plain.innerHTML = 'You would be paid <b>' + money(incomeToday) + '</b> today to agree to buy ' + shares.toLocaleString('en-US') + ' shares at ' + money2(strike) + '. If it never gets there, you keep the ' + money(incomeToday) + ' and can do it again.';
          math = 'Premium (Black-Scholes put, ' + (sig * 100).toFixed(0) + '% vol) = <span class="hl">' + money2(prem) + ' / share</span><br>'
            + 'Income today = premium × 100 × contracts = <span class="hl">' + money(incomeToday) + '</span><br>'
            + 'Cash secured = strike × 100 × contracts = <span class="hl">' + money(capital) + '</span><br>'
            + 'Period return = premium ÷ strike = <span class="hl">' + pct(periodRet) + '</span><br>'
            + 'Buy price if assigned = strike − premium = <span class="hl">' + money2(buyPrice) + '</span>';
        } else {
          var shareValue = stock * shares,
            periodRet2 = stock ? prem / stock * 100 : NaN,
            calledRet = stock ? (((strike - stock) + prem) / stock) * 100 : NaN,
            annualRet2 = (stock && daysOK) ? (prem / stock) * (365 / days) * 100 : NaN,
            breakeven = stock - prem;
          out.heroLabel.textContent = 'You would be paid today';
          rows += rowHTML('Value of your shares', money(shareValue), 'the 100 shares per contract you already own');
          rows += rowHTML('Return for the period', pct(periodRet2), 'on the value of your shares, if not called', true);
          rows += rowHTML('Total return if called away', pct(calledRet), 'the premium plus any move up to the strike');
          rows += rowHTML('Breakeven', money2(breakeven), 'your cost cushion is the premium');
          annual = pct(annualRet2);
          out.plain.innerHTML = 'You already own the shares, and you would be paid <b>' + money(incomeToday) + '</b> today to agree to sell them at ' + money2(strike) + '. If they stay below that, you keep the shares and the income.';
          math = 'Premium (Black-Scholes call, ' + (sig * 100).toFixed(0) + '% vol) = <span class="hl">' + money2(prem) + ' / share</span><br>'
            + 'Income today = premium × 100 × contracts = <span class="hl">' + money(incomeToday) + '</span><br>'
            + 'Value of shares = stock × 100 × contracts = <span class="hl">' + money(shareValue) + '</span><br>'
            + 'Period return = premium ÷ stock price = <span class="hl">' + pct(periodRet2) + '</span><br>'
            + 'If called away = ((strike − stock) + premium) ÷ stock = <span class="hl">' + pct(calledRet) + '</span><br>'
            + 'Breakeven = stock − premium = <span class="hl">' + money2(breakeven) + '</span>';
        }

        out.metrics.innerHTML = rows;
        out.annual.textContent = annual;
        out.mathbox.innerHTML = math;
        animateHero(incomeToday);
      }

      Object.keys(num).forEach(function (k) {
        num[k].addEventListener('input', function () { if (sld[k]) sld[k].value = num[k].value; if (k === 'stock') updateStrikeBounds(); calc(); });
        if (sld[k]) sld[k].addEventListener('input', function () { num[k].value = sld[k].value; if (k === 'stock') updateStrikeBounds(); calc(); });
        num[k].addEventListener('change', function () {
          var lo = parseFloat(num[k].min), hi = parseFloat(num[k].max), val = v(num[k]);
          if (!isNaN(lo) && val < lo) val = lo; if (!isNaN(hi) && val > hi) val = hi;
          num[k].value = val; if (sld[k]) sld[k].value = val;
          if (k === 'stock') updateStrikeBounds();
          calc();
        });
      });

      root.querySelectorAll('[data-strat]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          mode = btn.getAttribute('data-strat');
          lm.setAttribute('data-mode', mode);
          root.querySelectorAll('[data-strat]').forEach(function (b) { b.setAttribute('aria-selected', b === btn ? 'true' : 'false'); });
          if (mode === 'cc') { out.lblStrike.textContent = 'Strike price'; out.whyStrike.textContent = 'the price you would sell at'; }
          else { out.lblStrike.textContent = 'Strike price'; out.whyStrike.textContent = "the price you'd agree to buy at"; }
          setPreset('balanced');
        });
      });

      function applyPreset(name) {
        var p = PRESETS[mode][name]; if (!p) return;
        Object.keys(p).forEach(function (k) { if (!num[k]) return; num[k].value = p[k]; if (sld[k]) sld[k].value = p[k]; });
        updateStrikeBounds();
        calc();
      }
      function setPreset(name) {
        root.querySelectorAll('[data-preset]').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-preset') === name ? 'true' : 'false'); });
        applyPreset(name);
      }
      root.querySelectorAll('[data-preset]').forEach(function (c) {
        c.addEventListener('click', function () { setPreset(c.getAttribute('data-preset')); });
      });

      var mt = $('mathtoggle');
      mt.addEventListener('click', function () {
        var box = out.mathbox, open = box.classList.toggle('open');
        mt.setAttribute('aria-expanded', open ? 'true' : 'false');
        mt.textContent = (open ? '▾ Hide the math' : '▸ Show the math');
      });

      out.heroValue.textContent = '$0'; animCur = 0;
      updateStrikeBounds();
      calc();
    }
  }

  customElements.define('income-calculator', IncomeCalculator);
})();
