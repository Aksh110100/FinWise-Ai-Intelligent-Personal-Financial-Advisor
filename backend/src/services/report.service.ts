import PDFDocument from 'pdfkit';
import { Response } from 'express';
import path from 'path';
import fs from 'fs';

interface ReportSnapshot {
  generatedAt: string;
  user: { id: string; name: string; email: string; currency?: string };
  period: string;
  summary: {
    totalAllTime: number;
    thisMonthTotal: number;
    prevMonthTotal: number;
    monthlyChangePct: number;
    avgMonthly: number;
    projectedYear: number;
    totalCount: number;
    savingsRate: number | null;
  };
  growth: Array<{ key: string; label: string; saved: number }>;
  monthlySavings: Array<{ key: string; monthLabel: string; amount: number }>;
  sources: Array<{ label: string; source: string; impact: number }>;
  goals: Array<{
    id: string; name: string; targetAmount: number;
    savedAmount: number; remainingAmount: number;
    progress: number; status: string;
    targetDate?: string; category?: string;
  }>;
  goalLinkedSavings: Array<{ goalId: string; goalName: string; totalLinked: number }>;
  unassignedTotal: number;
  transactions: Array<{
    id: string; name: string; amount: number; date: string;
    source: string; goalId?: string; note?: string; type: string;
  }>;
  insights: {
    totalSavings: number; largestSource: string;
    activeGoals: number; completedGoals: number;
    largestSingle: number; averageSaving: number; mostSavedMonth: string;
  };
  forecast?: { current: number; threeMonths: number; sixMonths: number; twelveMonths: number; } | null;
}

export class ReportService {
  static generateSavingsReportPDF(snapshot: ReportSnapshot, res: Response) {
    const doc = new PDFDocument({
      size: 'A4', margin: 0, autoFirstPage: false, bufferPages: true,
      info: { Title: 'FinWise AI Savings & Goals Report', Author: 'FinWise AI' },
    });
    
    // Catch errors within pdfkit to avoid unhandled rejections/exceptions
    doc.on('error', (err) => {
      console.error('PDFKit error:', err);
      if (!res.headersSent) res.status(500).send('PDF generation failed');
      else if (!res.writableEnded) res.end();
    });

    doc.pipe(res);

    try {
      const PW = 595.28, PH = 841.89;
      const ML = 44, MR = 44, MT = 44, MB = 48;
      const CW = PW - ML - MR;

      const C = {
        bg: '#0F1115', card: '#14171C', cardAlt: '#1A1D23',
        primary: '#F5F5F5', secondary: '#8A8A8A',
        accent: '#E3B873', divider: '#252525',
        positive: '#2ECC71', negative: '#E74C3C', bar: '#1E2129',
      };

    let Y = MT;
    let pageIdx = -1;

    const logoPath = path.resolve(process.cwd(), '../frontend/public/logo.png');
    const hasLogo = fs.existsSync(logoPath);

    const fmt = (val: number): string => {
      const n = Math.round(Math.abs(val));
      return 'Rs. ' + n.toLocaleString('en-IN');
    };
    const fmtSigned = (val: number): string =>
      (val >= 0 ? '+' : '-') + fmt(Math.abs(val));

    const userName =
      snapshot.user && snapshot.user.name && snapshot.user.name !== 'undefined' && snapshot.user.name.trim()
        ? snapshot.user.name.trim()
        : snapshot.user && snapshot.user.email ? snapshot.user.email.split('@')[0] : 'FinWise User';

    const genDate = new Date(snapshot.generatedAt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    const ensureSpace = (h: number): boolean => {
      if (Y + h > PH - MB) { addPage(); return true; }
      return false;
    };

    const hLine = (x1: number, x2: number, color = C.divider, w = 0.5) =>
      doc.moveTo(x1, Y).lineTo(x2, Y).strokeColor(color).lineWidth(w).stroke();

    const hLineAt = (yy: number, x1: number, x2: number, color = C.divider, w = 0.5) =>
      doc.moveTo(x1, yy).lineTo(x2, yy).strokeColor(color).lineWidth(w).stroke();

    const addPage = () => {
      doc.addPage({ size: 'A4', margin: 0 });
      pageIdx++;
      doc.rect(0, 0, PW, PH).fill(C.bg);
      Y = MT;
      if (pageIdx > 0) drawRunningHeader();
    };

    const drawRunningHeader = () => {
      if (hasLogo) { doc.image(logoPath, ML, Y - 4, { height: 18 }); }
      else { doc.fontSize(9).fillColor(C.accent).font('Helvetica-Bold').text('FINWISE AI', ML, Y); }
      doc.fontSize(8).fillColor(C.secondary).font('Helvetica')
        .text('SAVINGS & GOALS REPORT', ML, Y + 20, { width: CW });
      Y += 36; hLine(ML, ML + CW, C.divider, 0.5); Y += 12;
    };

    const drawAllFooters = () => {
      let range;
      try {
        range = doc.bufferedPageRange();
      } catch(e) {
        range = { start: 0, count: pageIdx + 1 };
      }
      
      const count = range.count;
      for (let i = range.start; i < range.start + count; i++) {
        doc.switchToPage(i);
        const fy = PH - MB + 18;
        doc.fontSize(7).fillColor(C.secondary).font('Helvetica');
        doc.text('FINWISE AI  |  Savings & Goals Report', ML, fy, { align: 'left' });
        doc.text(genDate, ML, fy, { width: CW, align: 'center' });
        doc.text('Page ' + (i + 1), ML, fy, { width: CW, align: 'right' });
        hLineAt(fy - 6, ML, ML + CW, C.divider, 0.5);
      }
    };

    const sectionTitle = (title: string, gap = 14) => {
      ensureSpace(38);
      doc.fontSize(13).fillColor(C.primary).font('Helvetica-Bold').text(title, ML, Y);
      Y += 18; hLine(ML, ML + CW, C.accent, 1); Y += gap;
    };

    const subTitle = (title: string, gap = 10) => {
      ensureSpace(28);
      doc.fontSize(10).fillColor(C.accent).font('Helvetica-Bold').text(title, ML, Y);
      Y += 14; hLine(ML, ML + CW, C.divider, 0.5); Y += gap;
    };

    // PAGE 1 - Cover + Executive Summary + Savings Summary + Sources
    addPage();

    if (hasLogo) { doc.image(logoPath, ML, Y, { height: 32 }); Y += 44; }
    else { doc.fontSize(13).fillColor(C.accent).font('Helvetica-Bold').text('FINWISE AI', ML, Y); Y += 24; }

    doc.fontSize(26).fillColor(C.primary).font('Helvetica-Bold').text('SAVINGS & GOALS REPORT', ML, Y);
    Y += 34;
    doc.fontSize(11).fillColor(C.secondary).font('Helvetica')
      .text('Financial overview, goal progress, and savings analysis', ML, Y);
    Y += 22;
    doc.fontSize(8.5).fillColor(C.secondary).font('Helvetica');
    doc.text('Report Period:  ' + snapshot.period, ML, Y);
    doc.text('Generated:  ' + genDate, ML + 200, Y);
    doc.text('Prepared for:  ' + userName, ML + 380, Y);
    Y += 18; hLine(ML, ML + CW, C.accent, 1); Y += 24;

    sectionTitle('EXECUTIVE SUMMARY', 16);
    const isGoalCompleted = (g: any) => g.status === 'COMPLETED' || (g.progress >= 100) || (g.targetAmount > 0 && g.savedAmount >= g.targetAmount);
    
    const activeGoals   = snapshot.goals.filter((g: any) => !isGoalCompleted(g)).length;
    const completedGoals = snapshot.goals.filter((g: any) => isGoalCompleted(g)).length;
    const overdueGoals  = snapshot.goals.filter((g: any) =>
      !isGoalCompleted(g) && g.targetDate && new Date(g.targetDate) < new Date()
    ).length;

    const metricCards = [
      { label: 'TOTAL SAVED',     value: fmt(snapshot.summary.totalAllTime),   sub: snapshot.summary.totalCount + ' transactions' },
      { label: 'THIS MONTH',      value: fmt(snapshot.summary.thisMonthTotal),  sub: (snapshot.summary.monthlyChangePct >= 0 ? '+' : '') + snapshot.summary.monthlyChangePct + '% vs last month' },
      { label: 'ACTIVE GOALS',    value: activeGoals.toString(),               sub: overdueGoals > 0 ? overdueGoals + ' overdue' : 'all on track' },
      { label: 'COMPLETED GOALS', value: completedGoals.toString(),             sub: 'successfully achieved' },
    ];

    const cW2 = (CW - 16) / 2, cH = 72;
    metricCards.forEach((m, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const cx = ML + col * (cW2 + 16), cy = Y + row * (cH + 12);
      doc.roundedRect(cx, cy, cW2, cH, 5).fill(C.card);
      doc.rect(cx, cy, 3, cH).fill(C.accent);
      doc.fontSize(7.5).fillColor(C.secondary).font('Helvetica-Bold').text(m.label, cx + 14, cy + 12, { width: cW2 - 20 });
      doc.fontSize(19).fillColor(C.primary).font('Helvetica-Bold').text(m.value, cx + 14, cy + 25, { width: cW2 - 20 });
      doc.fontSize(7.5).fillColor(C.secondary).font('Helvetica').text(m.sub, cx + 14, cy + 54, { width: cW2 - 20 });
    });
    Y += 2 * (cH + 12) + 18;

    sectionTitle('SAVINGS SUMMARY', 12);
    const summaryRows = [
      ['Total Saved (All Time)',   fmt(snapshot.summary.totalAllTime)],
      ['This Month',               fmt(snapshot.summary.thisMonthTotal)],
      ['Previous Month',           fmt(snapshot.summary.prevMonthTotal)],
      ['Monthly Change',           (snapshot.summary.monthlyChangePct >= 0 ? '+' : '') + snapshot.summary.monthlyChangePct + '%'],
      ['Average Monthly (6 mo)',   fmt(snapshot.summary.avgMonthly)],
      ['Projected Annual',         fmt(snapshot.summary.projectedYear)],
      ['Savings Rate',             snapshot.summary.savingsRate != null ? snapshot.summary.savingsRate + '%' : 'Not available'],
      ['Total Transactions',       snapshot.summary.totalCount.toString()],
    ];
    summaryRows.forEach((row, i) => {
      ensureSpace(22);
      if (i % 2 === 0) doc.rect(ML, Y - 3, CW, 22).fill(C.card);
      const vc = (row[0] === 'Monthly Change' && snapshot.summary.monthlyChangePct < 0) ? C.negative : C.primary;
      doc.fontSize(9.5).fillColor(C.secondary).font('Helvetica').text(row[0], ML + 10, Y, { width: CW * 0.55 });
      doc.fontSize(9.5).fillColor(vc).font('Helvetica-Bold').text(row[1], ML + 10, Y, { width: CW - 10, align: 'right' });
      Y += 22;
    });
    Y += 18;

    sectionTitle('SAVINGS SOURCES', 10);
    doc.fontSize(8).fillColor(C.accent).font('Helvetica-Bold');
    doc.text('SOURCE', ML + 10, Y, { width: 175 });
    doc.text('AMOUNT', ML + 195, Y, { width: 120, align: 'right' });
    doc.text('SHARE',  ML + 325, Y, { width: 80, align: 'right' });
    doc.text('VISUAL', ML + 415, Y, { width: CW - 415 });
    Y += 14; hLine(ML, ML + CW, C.accent, 1); Y += 8;

    const totalSrcAmt = snapshot.sources.reduce((s: number, x: any) => s + x.impact, 0);
    if (!snapshot.sources.length) {
      doc.fontSize(9).fillColor(C.secondary).font('Helvetica').text('No source data available.', ML + 10, Y); Y += 24;
    } else {
      snapshot.sources.forEach((s: any, i: number) => {
        ensureSpace(22);
        if (i % 2 === 0) doc.rect(ML, Y - 2, CW, 22).fill(C.card);
        const shr = totalSrcAmt > 0 ? (s.impact / totalSrcAmt) * 100 : 0;
        const bMW = CW - 425, bFW = bMW * (shr / 100);
        doc.fontSize(9.5).fillColor(C.primary).font('Helvetica').text(s.label, ML + 10, Y, { width: 180 });
        doc.fontSize(9.5).fillColor(C.primary).font('Helvetica-Bold').text(fmt(s.impact), ML + 195, Y, { width: 120, align: 'right' });
        doc.fontSize(9.5).fillColor(C.secondary).font('Helvetica').text(shr.toFixed(1) + '%', ML + 325, Y, { width: 80, align: 'right' });
        doc.rect(ML + 415, Y + 3, bMW, 8).fill(C.bar);
        if (bFW > 0) doc.rect(ML + 415, Y + 3, bFW, 8).fill(C.accent);
        Y += 22; hLineAt(Y - 4, ML, ML + CW, C.divider, 0.3);
      });
      ensureSpace(26);
      doc.rect(ML, Y - 2, CW, 26).fill(C.cardAlt);
      doc.fontSize(9.5).fillColor(C.accent).font('Helvetica-Bold').text('TOTAL', ML + 10, Y + 3, { width: 180 });
      doc.fontSize(9.5).fillColor(C.primary).font('Helvetica-Bold').text(fmt(totalSrcAmt), ML + 195, Y + 3, { width: 120, align: 'right' });
      doc.fontSize(9.5).fillColor(C.secondary).font('Helvetica').text('100%', ML + 325, Y + 3, { width: 80, align: 'right' });
      Y += 30;
    }
    Y += 8;

    // PAGE 2 - Savings Growth + Monthly Analysis
    if (Y > MT + 80) addPage();

    sectionTitle('SAVINGS GROWTH & TRENDS', 12);
    const CHART_H = 200;
    ensureSpace(CHART_H + 50);
    doc.roundedRect(ML, Y, CW, CHART_H, 4).fill(C.card);

    if (!snapshot.growth || snapshot.growth.length === 0) {
      doc.fontSize(9).fillColor(C.secondary).font('Helvetica')
        .text('No savings history available for growth chart.', ML, Y + CHART_H / 2 - 5, { align: 'center', width: CW });
    } else {
      const data = snapshot.growth;
      const maxV = Math.max(...data.map((d: any) => d.saved), 1);
      const iX = ML + 50, iW = CW - 58, iY = Y + 16, iH = CHART_H - 46;

      for (let g = 0; g <= 4; g++) {
        const val = maxV * (g / 4);
        const gy  = iY + iH - iH * (g / 4);
        const lbl = val === 0 ? '0' : val >= 100000 ? (val / 100000).toFixed(1) + 'L' : (val / 1000).toFixed(0) + 'K';
        doc.fontSize(7).fillColor(C.secondary).font('Helvetica').text(lbl, ML + 2, gy - 4, { width: 44, align: 'right' });
        doc.moveTo(iX, gy).lineTo(iX + iW, gy).strokeColor(g === 0 ? C.divider : '#1C1C22').lineWidth(0.4).stroke();
      }

      const sX = iW / Math.max(data.length - 1, 1);
      const pX = (i: number) => iX + i * sX;
      const pY = (v: number) => iY + iH - (v / maxV) * iH;

      if (data.length > 1) {
        doc.save();
        doc.moveTo(pX(0), pY(data[0].saved));
        data.forEach((d: any, i: number) => { if (i > 0) doc.lineTo(pX(i), pY(d.saved)); });
        doc.lineTo(pX(data.length - 1), iY + iH);
        doc.lineTo(pX(0), iY + iH);
        doc.closePath().fillColor('#E3B87320').fill();
        doc.restore();
      }

      doc.strokeColor(C.accent).lineWidth(2);
      doc.moveTo(pX(0), pY(data[0].saved));
      data.forEach((d: any, i: number) => { if (i > 0) doc.lineTo(pX(i), pY(d.saved)); });
      doc.stroke();

      data.forEach((d: any, i: number) => {
        const px = pX(i), py = pY(d.saved);
        doc.circle(px, py, 3.5).fill(C.accent);
        const show = data.length <= 8 || i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 7) === 0;
        if (show) {
          doc.fontSize(7).fillColor(C.secondary).font('Helvetica')
            .text(d.label, px - 20, iY + iH + 8, { width: 40, align: 'center' });
        }
        if (i === data.length - 1) {
          doc.fontSize(7.5).fillColor(C.accent).font('Helvetica-Bold')
            .text(fmt(d.saved), px - 72, py - 14, { width: 68, align: 'right' });
        }
      });
    }
    Y += CHART_H + 20;

    const ms = snapshot.monthlySavings;
    if (ms && ms.length > 1) {
      ensureSpace(170);
      subTitle('MONTHLY SAVINGS TREND', 10);
      const BCH = 140, bData = ms.slice(0, 12).reverse();
      const bMax = Math.max(...bData.map((m: any) => m.amount), 1);
      const bIH = BCH - 32, bIY = Y + 8;
      const bSW = CW / bData.length, bBW = Math.min(bSW - 6, 38);
      doc.roundedRect(ML, Y, CW, BCH, 4).fill(C.card);
      bData.forEach((m: any, i: number) => {
        const bH = bMax > 0 ? (m.amount / bMax) * bIH : 0;
        const bX = ML + i * bSW + (bSW - bBW) / 2, bY = bIY + bIH - bH;
        doc.rect(bX, bIY, bBW, bIH).fill(C.bar);
        if (bH > 0) doc.rect(bX, bY, bBW, bH).fill(C.accent);
        doc.fontSize(6.5).fillColor(C.secondary).font('Helvetica')
          .text(m.monthLabel.slice(0, 3), bX - 2, bIY + bIH + 5, { width: bBW + 4, align: 'center' });
        if (m.amount > 0 && bBW >= 20) {
          const as = m.amount >= 100000 ? (m.amount/100000).toFixed(1)+'L' : m.amount>=1000 ? (m.amount/1000).toFixed(0)+'K' : m.amount.toString();
          doc.fontSize(6).fillColor(C.secondary).font('Helvetica').text(as, bX-2, bY-11, { width: bBW+4, align: 'center' });
        }
      });
      Y += BCH + 16;
    } else {
      ensureSpace(36);
      doc.fontSize(9).fillColor(C.secondary).font('Helvetica')
        .text('Insufficient savings history for trend chart. Add savings across multiple months.', ML + 10, Y, { width: CW - 20 });
      Y += 36;
    }

    ensureSpace(80);
    sectionTitle('MONTHLY SAVINGS BREAKDOWN', 10);
    doc.fontSize(8).fillColor(C.accent).font('Helvetica-Bold');
    doc.text('MONTH', ML + 10, Y, { width: 260 });
    doc.text('AMOUNT SAVED', ML + 270, Y, { width: 110, align: 'right' });
    doc.text('% OF TOTAL', ML + 390, Y, { width: CW - 390, align: 'right' });
    Y += 14; hLine(ML, ML + CW, C.accent, 1); Y += 8;

    if (!ms || !ms.length) {
      doc.fontSize(9).fillColor(C.secondary).font('Helvetica').text('No monthly data.', ML + 10, Y); Y += 24;
    } else {
      ms.forEach((m: any, i: number) => {
        ensureSpace(22);
        if (i % 2 === 0) doc.rect(ML, Y - 2, CW, 22).fill(C.card);
        const pct = snapshot.summary.totalAllTime > 0
          ? ((m.amount / snapshot.summary.totalAllTime) * 100).toFixed(1) : '0.0';
        doc.fontSize(9.5).fillColor(C.primary).font('Helvetica').text(m.monthLabel, ML + 10, Y, { width: 260 });
        doc.fontSize(9.5).fillColor(C.primary).font('Helvetica-Bold').text(fmt(m.amount), ML + 270, Y, { width: 110, align: 'right' });
        doc.fontSize(9.5).fillColor(C.secondary).font('Helvetica').text(pct + '%', ML + 390, Y, { width: CW - 390, align: 'right' });
        Y += 22; hLineAt(Y - 4, ML, ML + CW, C.divider, 0.3);
      });
    }
    Y += 16;

    // PAGE 3 - Goals Analysis
    if (Y > MT + 80) addPage();
    sectionTitle('SAVINGS GOALS ANALYSIS', 14);

    const gMCards = [
      { label: 'TOTAL GOALS', value: snapshot.goals.length.toString(), clr: C.accent },
      { label: 'ACTIVE',      value: activeGoals.toString(),           clr: C.accent },
      { label: 'COMPLETED',   value: completedGoals.toString(),        clr: C.positive },
      { label: 'OVERDUE',     value: overdueGoals.toString(),          clr: C.negative },
    ];
    const gCW = (CW - 24) / 4, gCH = 58;
    gMCards.forEach((m, i) => {
      const gx = ML + i * (gCW + 8);
      doc.roundedRect(gx, Y, gCW, gCH, 4).fill(C.card);
      doc.rect(gx, Y, 3, gCH).fill(m.clr);
      doc.fontSize(7).fillColor(C.secondary).font('Helvetica-Bold').text(m.label, gx + 10, Y + 10, { width: gCW - 14 });
      doc.fontSize(20).fillColor(C.primary).font('Helvetica-Bold').text(m.value, gx + 10, Y + 24, { width: gCW - 14 });
    });
    Y += gCH + 20;

    const actGoals = snapshot.goals.filter((g: any) => !isGoalCompleted(g) || g.progress >= 100);
    // Display all goals in the active list if they have progress, but properly mark them as COMPLETED.
    // Actually, it's better to show completed goals in the COMPLETED GOALS section only, or mark them correctly.
    // Let's just separate them strictly.
    const strictActGoals = snapshot.goals.filter((g: any) => !isGoalCompleted(g));
    const strictCmpGoals = snapshot.goals.filter((g: any) => isGoalCompleted(g));
    
    subTitle('ACTIVE GOALS', 12);
    if (!strictActGoals.length) {
      doc.fontSize(9).fillColor(C.secondary).font('Helvetica').text('No active savings goals.', ML + 10, Y); Y += 24;
    } else {
      const GC = [ML, ML + 100, ML + 188, ML + 270, ML + 350, ML + 424];
      doc.fontSize(7.5).fillColor(C.accent).font('Helvetica-Bold');
      doc.text('GOAL',      GC[0]+8, Y, { width: 90 });
      doc.text('SAVED',     GC[1],   Y, { width: 83, align: 'right' });
      doc.text('TARGET',    GC[2],   Y, { width: 77, align: 'right' });
      doc.text('REMAINING', GC[3],   Y, { width: 68, align: 'right' });
      doc.text('PROGRESS',  GC[4],   Y, { width: 68 });
      doc.text('STATUS',    GC[5],   Y, { width: CW-(GC[5]-ML) });
      Y += 14; hLine(ML, ML + CW, C.accent, 1); Y += 8;

      strictActGoals.forEach((g: any, i: number) => {
        ensureSpace(46);
        if (i % 2 === 0) doc.rect(ML, Y - 3, CW, 42).fill(C.card);
        const pct = Math.min(Math.floor(g.progress || 0), 100);
        const isOD = g.targetDate && new Date(g.targetDate) < new Date();
        const tdStr = g.targetDate ? new Date(g.targetDate).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : 'No date';
        doc.fontSize(9).fillColor(C.primary).font('Helvetica-Bold')
          .text(g.name.length > 16 ? g.name.slice(0,14)+'...' : g.name, GC[0]+8, Y, { width: 90 });
        doc.fontSize(9).fillColor(C.primary).font('Helvetica').text(fmt(g.savedAmount), GC[1], Y, { width: 83, align: 'right' });
        doc.fontSize(9).fillColor(C.secondary).font('Helvetica').text(fmt(g.targetAmount), GC[2], Y, { width: 77, align: 'right' });
        doc.fontSize(9).fillColor(C.primary).font('Helvetica').text(fmt(g.remainingAmount), GC[3], Y, { width: 68, align: 'right' });
        const bX = GC[4], bW = 56, bF = bW * (pct / 100);
        doc.rect(bX, Y+4, bW, 4).fill(C.bar);
        if (bF > 0) doc.rect(bX, Y+4, bF, 4).fill(pct >= 100 ? C.positive : C.accent);
        doc.fontSize(7.5).fillColor(isOD ? C.negative : C.positive).font('Helvetica-Bold').text(pct + '%', bX, Y+12, { width: bW });
        doc.fontSize(8.5).fillColor(isOD ? C.negative : C.secondary).font('Helvetica')
          .text(isOD ? 'OVERDUE' : 'ACTIVE', GC[5], Y, { width: CW-(GC[5]-ML) });
        doc.fontSize(7.5).fillColor(C.secondary).font('Helvetica').text(tdStr, GC[5], Y+13, { width: CW-(GC[5]-ML) });
        Y += 44; hLineAt(Y - 6, ML, ML + CW, C.divider, 0.3);
      });
    }
    Y += 12;

    if (snapshot.goals.length > 0) {
      subTitle('GOAL PROGRESS DETAIL', 12);
      snapshot.goals.forEach((g: any) => {
        ensureSpace(94);
        const pct = Math.min(Math.floor(g.progress || 0), 100);
        const isCmp = isGoalCompleted(g);
        const isOD = !isCmp && g.targetDate && new Date(g.targetDate) < new Date();
        doc.roundedRect(ML, Y, CW, 84, 5).fill(C.card);
        doc.rect(ML, Y, 4, 84).fill(isCmp ? C.positive : isOD ? C.negative : C.accent);
        const gInX = ML + 18;
        doc.fontSize(11).fillColor(C.primary).font('Helvetica-Bold').text(g.name.toUpperCase(), gInX, Y+10, { width: CW-90 });
        const sLabel = isCmp ? 'COMPLETED' : isOD ? 'OVERDUE' : 'ACTIVE';
        const sColor = isCmp ? C.positive : isOD ? C.negative : C.accent;
        doc.fontSize(7.5).fillColor(sColor).font('Helvetica-Bold').text(sLabel, ML+CW-82, Y+10, { width: 74, align: 'right' });
        const pbW = CW - 110, pbH = 4;
        doc.rect(gInX, Y+34, pbW, pbH).fill(C.bar);
        const pbF = pbW * (pct / 100);
        if (pbF > 0) doc.rect(gInX, Y+34, pbF, pbH).fill(isCmp ? C.positive : C.accent);
        doc.fontSize(9).fillColor(C.primary).font('Helvetica-Bold').text(pct + '%', gInX+pbW+10, Y+30, { width: 40 });
        const sy = Y + 54;
        doc.fontSize(8.5).fillColor(C.secondary).font('Helvetica').text('Saved: ' + fmt(g.savedAmount), gInX, sy);
        doc.fontSize(8.5).fillColor(C.secondary).font('Helvetica').text('Target: ' + fmt(g.targetAmount), gInX+155, sy);
        doc.fontSize(8.5).fillColor(C.secondary).font('Helvetica').text('Remaining: ' + fmt(Math.max(0, g.targetAmount - g.savedAmount)), gInX+305, sy);
        Y += 94;
      });
    }

    Y += 8;
    ensureSpace(60); subTitle('COMPLETED GOALS', 10);
    if (!strictCmpGoals.length) {
      doc.fontSize(9).fillColor(C.secondary).font('Helvetica').text('No completed goals yet.', ML + 10, Y); Y += 24;
    } else {
      doc.fontSize(7.5).fillColor(C.accent).font('Helvetica-Bold');
      doc.text('GOAL NAME',  ML+8,  Y, { width: 195 });
      doc.text('TARGET',     ML+205, Y, { width: 105, align: 'right' });
      doc.text('SAVED',      ML+320, Y, { width: 105, align: 'right' });
      doc.text('COMPLETION', ML+435, Y, { width: CW-435 });
      Y += 13; hLine(ML, ML + CW, C.accent, 1); Y += 7;
      strictCmpGoals.forEach((g: any, i: number) => {
        ensureSpace(22);
        if (i % 2 === 0) doc.rect(ML, Y-2, CW, 22).fill(C.card);
        const pct = Math.min(g.targetAmount > 0 ? (g.savedAmount / g.targetAmount) * 100 : 100, 100);
        doc.fontSize(9).fillColor(C.positive).font('Helvetica-Bold').text(g.name, ML+8, Y, { width: 195 });
        doc.fontSize(9).fillColor(C.secondary).font('Helvetica').text(fmt(g.targetAmount), ML+205, Y, { width: 105, align: 'right' });
        doc.fontSize(9).fillColor(C.primary).font('Helvetica').text(fmt(g.savedAmount), ML+320, Y, { width: 105, align: 'right' });
        doc.fontSize(9).fillColor(C.positive).font('Helvetica-Bold').text(pct.toFixed(0) + '%', ML+435, Y, { width: CW-435 });
        Y += 22; hLineAt(Y-4, ML, ML+CW, C.divider, 0.3);
      });
    }
    Y += 20;

    // PAGE 4 - Source Analysis + Goal-Linked + Unassigned + Forecast + Insights
    if (Y > MT + 80) addPage();

    sectionTitle('SAVINGS SOURCE ANALYSIS', 12);
    if (!snapshot.sources.length) {
      doc.fontSize(9).fillColor(C.secondary).font('Helvetica').text('No source data.', ML+10, Y); Y += 24;
    } else {
      const srcMax = Math.max(...snapshot.sources.map((s: any) => s.impact), 1);
      snapshot.sources.forEach((s: any) => {
        ensureSpace(30);
        // Reduce bar width to make room for text
        const bw = CW - 240, bf = bw * (s.impact / srcMax);
        doc.fontSize(9).fillColor(C.primary).font('Helvetica').text(s.label, ML+8, Y+3, { width: 110 });
        doc.rect(ML+125, Y+5, bw, 6).fill(C.bar); // Minimal bar
        if (bf > 0) doc.rect(ML+125, Y+5, bf, 6).fill(C.accent);
        doc.fontSize(8.5).fillColor(C.primary).font('Helvetica-Bold').text(fmt(s.impact), ML+135+bw, Y+3, { width: 100, align: 'right' });
        Y += 24;
      });
    }
    Y += 10;

    ensureSpace(100); sectionTitle('GOAL-LINKED SAVINGS DISTRIBUTION', 12);
    if (!snapshot.goalLinkedSavings || !snapshot.goalLinkedSavings.length) {
      doc.fontSize(9).fillColor(C.secondary).font('Helvetica').text('No savings linked to goals.', ML+10, Y); Y += 24;
    } else {
      const glMax = Math.max(...snapshot.goalLinkedSavings.map((g: any) => g.totalLinked), 1);
      snapshot.goalLinkedSavings.forEach((gl: any, i: number) => {
        ensureSpace(30);
        if (i % 2 === 0) doc.rect(ML, Y-2, CW, 26).fill(C.card);
        const bw = CW - 240, bf = bw * (gl.totalLinked / glMax);
        doc.fontSize(9).fillColor(C.primary).font('Helvetica-Bold').text(gl.goalName, ML+8, Y+5, { width: 110 });
        doc.rect(ML+125, Y+7, bw, 6).fill(C.bar);
        if (bf > 0) doc.rect(ML+125, Y+7, bf, 6).fill(C.accent);
        doc.fontSize(8.5).fillColor(C.primary).font('Helvetica').text(fmt(gl.totalLinked), ML+135+bw, Y+4, { width: 100, align: 'right' });
        Y += 24;
      });
    }
    Y += 12;

    ensureSpace(70); sectionTitle('UNASSIGNED SAVINGS', 12);
    const unPct = snapshot.summary.totalAllTime > 0
      ? ((snapshot.unassignedTotal / snapshot.summary.totalAllTime) * 100).toFixed(1) : '0.0';
    doc.roundedRect(ML, Y, CW, 52, 5).fill(C.card);
    doc.rect(ML, Y, 3, 52).fill(C.secondary);
    doc.fontSize(10).fillColor(C.secondary).font('Helvetica').text('Total Unassigned Savings', ML+16, Y+10);
    doc.fontSize(20).fillColor(C.primary).font('Helvetica-Bold').text(fmt(snapshot.unassignedTotal), ML+16, Y+26);
    doc.fontSize(9).fillColor(C.secondary).font('Helvetica').text(unPct + '% of total savings', ML+CW-175, Y+22);
    Y += 66;

    if (snapshot.forecast) {
      ensureSpace(110); sectionTitle('SAVINGS FORECAST', 12);
      const fcData = [
        { label: 'Current',   val: snapshot.forecast.current },
        { label: '3 Months',  val: snapshot.forecast.threeMonths },
        { label: '6 Months',  val: snapshot.forecast.sixMonths },
        { label: '12 Months', val: snapshot.forecast.twelveMonths },
      ];
      const fcW = (CW - 24) / 4;
      fcData.forEach((fc, i) => {
        const fx = ML + i * (fcW + 8);
        doc.roundedRect(fx, Y, fcW, 66, 4).fill(C.card);
        doc.rect(fx, Y, 3, 66).fill(i === 0 ? C.secondary : C.accent);
        doc.fontSize(7).fillColor(C.secondary).font('Helvetica-Bold').text(fc.label, fx+10, Y+10, { width: fcW-14 });
        doc.fontSize(13).fillColor(C.primary).font('Helvetica-Bold').text(fmt(fc.val), fx+10, Y+26, { width: fcW-14 });
        if (i > 0 && snapshot.forecast) {
          const gr = fc.val - snapshot.forecast.current;
          doc.fontSize(7.5).fillColor(gr >= 0 ? C.positive : C.negative).font('Helvetica')
            .text(fmtSigned(gr), fx+10, Y+50, { width: fcW-14 });
        }
      });
      Y += 80;
    } else {
      ensureSpace(48);
      doc.fontSize(9).fillColor(C.secondary).font('Helvetica')
        .text('Not enough historical data for a reliable savings forecast.', ML+10, Y, { width: CW-20 });
      Y += 36;
    }

    ensureSpace(160); sectionTitle('SAVINGS INSIGHTS', 12);
    const insRows = [
      ['Total Savings',          fmt(snapshot.insights.totalSavings)],
      ['Largest Savings Source', snapshot.insights.largestSource || 'N/A'],
      ['Active Goals',           snapshot.insights.activeGoals.toString()],
      ['Completed Goals',        snapshot.insights.completedGoals.toString()],
      ['Largest Single Saving',  fmt(snapshot.insights.largestSingle)],
      ['Average Saving',         fmt(snapshot.insights.averageSaving)],
      ['Best Savings Month',     snapshot.insights.mostSavedMonth || 'N/A'],
    ];
    const iCW = (CW - 12) / 2;
    let iCol = 0, iRowY = Y;
    insRows.forEach(row => {
      ensureSpace(38);
      const ix = ML + iCol * (iCW + 12), iy = iRowY;
      doc.roundedRect(ix, iy, iCW, 36, 4).fill(C.card);
      doc.fontSize(7.5).fillColor(C.secondary).font('Helvetica').text(row[0], ix+10, iy+8, { width: iCW-14 });
      doc.fontSize(11).fillColor(C.primary).font('Helvetica-Bold').text(row[1], ix+10, iy+20, { width: iCW-14 });
      iCol++;
      if (iCol === 2) { iCol = 0; iRowY += 42; }
    });
    if (iCol !== 0) iRowY += 42;
    Y = iRowY + 12;

    // FINAL PAGES - Transaction History
    addPage();
    sectionTitle('SAVINGS TRANSACTION HISTORY', 12);

    doc.roundedRect(ML, Y, CW, 38, 4).fill(C.card);
    doc.fontSize(9).fillColor(C.secondary).font('Helvetica').text('Total Unassigned (no goal linked):', ML+12, Y+10);
    doc.fontSize(9).fillColor(C.primary).font('Helvetica-Bold')
      .text(fmt(snapshot.unassignedTotal), ML+12, Y+10, { width: CW-14, align: 'right' });
    doc.fontSize(7.5).fillColor(C.secondary).font('Helvetica')
      .text(snapshot.transactions.length + ' total records', ML+12, Y+24);
    Y += 50;

    const TC = { date: ML, name: ML+72, src: ML+228, goal: ML+298, type: ML+390, amt: ML+430 };

    const drawTxH = () => {
      ensureSpace(28);
      doc.fontSize(7.5).fillColor(C.accent).font('Helvetica-Bold');
      doc.text('DATE',       TC.date, Y, { width: 69 });
      doc.text('NAME / NOTE', TC.name, Y, { width: 153 });
      doc.text('SOURCE',     TC.src,  Y, { width: 67 });
      doc.text('GOAL',       TC.goal, Y, { width: 89 });
      doc.text('TYPE',       TC.type, Y, { width: 37 });
      doc.text('AMOUNT',     TC.amt,  Y, { width: CW-(TC.amt-ML), align: 'right' });
      Y += 13; hLine(ML, ML+CW, C.accent, 1); Y += 7;
    };
    drawTxH();

    if (!snapshot.transactions || !snapshot.transactions.length) {
      doc.fontSize(9).fillColor(C.secondary).font('Helvetica').text('No savings transactions found.', ML+10, Y); Y += 30;
    } else {
      snapshot.transactions.forEach((tx: any, i: number) => {
        if (ensureSpace(22)) drawTxH();
        if (i % 2 === 0) doc.rect(ML, Y-2, CW, 20).fill(C.card);

        let txDate = '';
        try {
          const d = new Date(tx.date);
          txDate = isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
        } catch (e) { txDate = ''; }

        let nn = tx.name || '';
        if (tx.note && tx.note.trim()) nn += ' - ' + tx.note.trim();
        if (nn.length > 28) nn = nn.slice(0, 25) + '...';

        const srcL = tx.source ? tx.source.charAt(0) + tx.source.slice(1).toLowerCase().replace(/_/g, ' ') : 'Other';
        const srcS = srcL.length > 12 ? srcL.slice(0, 10) + '.' : srcL;

        let gLabel = '';
        if (tx.goalId) {
          const gf = snapshot.goals.find((g: any) => g.id === tx.goalId);
          if (gf) gLabel = (gf as any).name.length > 14 ? (gf as any).name.slice(0,12)+'...' : (gf as any).name;
        }

        const tS = tx.type ? tx.type.charAt(0) + tx.type.slice(1).toLowerCase().slice(0, 6) : '';

        doc.fontSize(8.5).fillColor(C.secondary).font('Helvetica').text(txDate, TC.date, Y, { width: 69 });
        doc.fontSize(8.5).fillColor(C.primary).font('Helvetica').text(nn, TC.name, Y, { width: 153 });
        doc.fontSize(8.5).fillColor(C.secondary).font('Helvetica').text(srcS, TC.src, Y, { width: 67 });
        doc.fontSize(8.5).fillColor(tx.goalId ? C.accent : C.secondary).font('Helvetica')
          .text(gLabel || '', TC.goal, Y, { width: 89 });
        doc.fontSize(7.5).fillColor(C.secondary).font('Helvetica').text(tS, TC.type, Y, { width: 37 });
        doc.fontSize(8.5).fillColor(C.primary).font('Helvetica-Bold')
          .text(fmt(tx.amount), TC.amt, Y, { width: CW-(TC.amt-ML), align: 'right' });
        Y += 20; hLineAt(Y-4, ML, ML+CW, C.divider, 0.3);
      });
    }
    Y += 16;

    ensureSpace(80); Y += 10;
    hLine(ML, ML+CW, C.divider, 0.5); Y += 16;
    doc.fontSize(9).fillColor(C.accent).font('Helvetica-Bold').text('REPORT NOTE', ML, Y); Y += 14;
    doc.fontSize(8).fillColor(C.secondary).font('Helvetica').text(
      'This report is generated from the live financial data in your FinWise AI account. ' +
      'All figures are in Indian Rupees (INR). Goal progress reflects savings linked to each goal via goalId. ' +
      'Forecasting uses average monthly savings over the last 6 months. For personal financial awareness only.',
      ML, Y, { width: CW }
    );
    Y += 44;

    ensureSpace(40);
    if (hasLogo) { doc.image(logoPath, ML, Y, { height: 22 }); Y += 30; }
    doc.fontSize(8).fillColor(C.secondary).font('Helvetica')
      .text('Generated by FinWise AI  |  ' + genDate + '  |  ' + userName, ML, Y, { width: CW, align: 'center' });

    drawAllFooters();
    doc.end();
    } catch (error) {
      console.error('generateSavingsReportPDF Error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'PDF generation failed' });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  }
}
