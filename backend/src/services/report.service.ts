import PDFDocument from 'pdfkit';
import { Response } from 'express';
import path from 'path';
import fs from 'fs';

export class ReportService {
  static generateSavingsReportPDF(snapshot: any, res: Response) {
    // 4. PAGE SIZE: A4 Portrait, 595.28 × 841.89 points
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      autoFirstPage: false,
      bufferPages: true,
      info: {
        Title: 'FinWise AI Savings & Goals Report',
        Author: 'FinWise AI',
      }
    });

    doc.pipe(res);

    // 5. PAGE MARGINS
    const leftMargin = 44;
    const rightMargin = 44;
    const topMargin = 42;
    const bottomMargin = 45;
    
    const pageHeight = 841.89;
    const pageWidth = 595.28;
    const contentWidth = pageWidth - leftMargin - rightMargin; // ~507pt

    // Global state
    let currentY = topMargin;
    let pageCount = 0;

    const logoPath = path.resolve(process.cwd(), '../frontend/public/logo.png');

    // 8. REPORT DESIGN LANGUAGE
    const colors = {
      background: '#0F1115',
      primary: '#F5F5F5',
      secondary: '#969696',
      accent: '#E3B873',
      divider: '#2A2A2A',
    };

    // Helper: format currency
    const formatCurrency = (val: number) => `INR ${Math.round(val).toLocaleString('en-IN')}`.replace('INR ', '₹');

    // Layout engine: 6. GLOBAL LAYOUT SYSTEM
    const ensureSpace = (requiredHeight: number) => {
      if (currentY + requiredHeight > pageHeight - bottomMargin) {
        addPage();
        return true;
      }
      return false;
    };

    const addPage = () => {
      doc.addPage({ size: 'A4', margin: 0 });
      pageCount++;
      
      // Draw background
      doc.rect(0, 0, pageWidth, pageHeight).fill(colors.background);
      
      currentY = topMargin;
      
      if (pageCount > 1) {
        drawHeader();
      }
    };

    const drawFooter = () => {
      const generatedDate = new Date(snapshot.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(7).fillColor(colors.secondary);
        
        const footerY = pageHeight - bottomMargin + 15;
        
        doc.text('FINWISE AI | Savings & Goals Report', leftMargin, footerY, { align: 'left' });
        doc.text(`Generated: ${generatedDate}`, leftMargin, footerY, { align: 'center', width: contentWidth });
        doc.text(`Page ${i + 1}`, leftMargin, footerY, { align: 'right', width: contentWidth });
      }
    };

    const drawHeader = () => {
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, leftMargin, currentY - 5, { height: 20 });
      } else {
        doc.fontSize(10).fillColor(colors.accent).text('FINWISE AI', leftMargin, currentY);
      }
      doc.fontSize(12).fillColor(colors.primary).text('SAVINGS & GOALS REPORT', leftMargin, currentY + 18);
      
      currentY += 40;
      doc.moveTo(leftMargin, currentY).lineTo(pageWidth - rightMargin, currentY).strokeColor(colors.divider).lineWidth(1).stroke();
      currentY += 20;
    };

    // 9. PAGE 1 — EXECUTIVE REPORT
    const drawCoverTitle = () => {
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, leftMargin, currentY, { height: 28 });
        currentY += 40;
      } else {
        doc.fontSize(14).fillColor(colors.accent).text('FINWISE AI', leftMargin, currentY);
        currentY += 24;
      }
      
      doc.fontSize(28).fillColor(colors.primary).text('SAVINGS & GOALS REPORT', leftMargin, currentY);
      currentY += 34;
      
      doc.fontSize(12).fillColor(colors.secondary).text('Financial overview and progress analysis', leftMargin, currentY);
      currentY += 30;

      const generatedDate = new Date(snapshot.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      
      doc.fontSize(9).fillColor(colors.secondary);
      doc.text(`Report Period: All-Time`, leftMargin, currentY);
      doc.text(`Generated: ${generatedDate}`, leftMargin + 150, currentY);
      if (snapshot.user) {
        doc.text(`User: ${snapshot.user.name || snapshot.user.email}`, leftMargin + 300, currentY);
      }
      
      currentY += 40;
    };

    const drawSectionTitle = (title: string, spacing = 20) => {
      ensureSpace(40);
      doc.fontSize(14).fillColor(colors.primary).text(title, leftMargin, currentY);
      currentY += spacing;
    };

    const drawMetricGrid = () => {
      ensureSpace(120);
      drawSectionTitle('EXECUTIVE SUMMARY');
      
      const cardWidth = (contentWidth - 20) / 2;
      const cardHeight = 65;
      
      const metrics = [
        { label: 'TOTAL SAVED', value: formatCurrency(snapshot.summary.totalAllTime || 0) },
        { label: 'THIS MONTH', value: formatCurrency(snapshot.summary.thisMonthTotal || 0) },
        { label: 'ACTIVE GOALS', value: snapshot.goals.filter((g: any) => g.status === 'ACTIVE').length.toString() },
        { label: 'COMPLETED', value: snapshot.goals.filter((g: any) => g.status === 'COMPLETED').length.toString() }
      ];

      metrics.forEach((m, i) => {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const x = leftMargin + (col * (cardWidth + 20));
        const y = currentY + (row * (cardHeight + 15));

        doc.roundedRect(x, y, cardWidth, cardHeight, 4).fillAndStroke('#15181C', colors.divider);
        
        doc.fontSize(9).fillColor(colors.secondary).text(m.label, x + 15, y + 15);
        doc.fontSize(16).fillColor(colors.primary).text(m.value, x + 15, y + 32);
      });
      
      currentY += (2 * cardHeight) + 15 + 40;
    };

    const drawSummaryTable = () => {
      ensureSpace(120);
      drawSectionTitle('SAVINGS SUMMARY');
      
      const data = [
        ['Total Saved', formatCurrency(snapshot.summary.totalAllTime || 0)],
        ['This Month', formatCurrency(snapshot.summary.thisMonthTotal || 0)],
        ['Monthly Change', `${snapshot.summary.monthlyChangePct > 0 ? '+' : ''}${snapshot.summary.monthlyChangePct || 0}%`],
        ['Projected Year', formatCurrency(snapshot.summary.projectedYear || 0)]
      ];

      // Add Health if active goal exists
      const firstGoal = snapshot.goals.find((g: any) => g.status === 'ACTIVE');
      if (firstGoal) {
        const healthScore = Math.floor(firstGoal.progress || 0);
        data.push(['Savings Health', `${healthScore}%`]);
      } else {
        data.push(['Savings Health', '—']);
      }

      const rowHeight = 22;
      data.forEach((row, i) => {
        const y = currentY + (i * rowHeight);
        doc.fontSize(10).fillColor(colors.secondary).text(row[0], leftMargin, y);
        doc.fillColor(colors.primary).text(row[1], leftMargin, y, { align: 'right', width: contentWidth });
        
        doc.moveTo(leftMargin, y + 18).lineTo(leftMargin + contentWidth, y + 18).strokeColor(colors.divider).lineWidth(0.5).stroke();
      });

      currentY += (data.length * rowHeight) + 40;
    };

    const drawSourceBreakdown = () => {
      ensureSpace(100);
      drawSectionTitle('SAVINGS SOURCES');
      
      // Header
      doc.fontSize(9).fillColor(colors.accent);
      doc.text('SOURCE', leftMargin, currentY);
      doc.text('AMOUNT', leftMargin + 200, currentY, { width: 150, align: 'right' });
      doc.text('SHARE', leftMargin + 350, currentY, { width: contentWidth - 350, align: 'right' });
      
      currentY += 15;
      doc.moveTo(leftMargin, currentY).lineTo(leftMargin + contentWidth, currentY).strokeColor(colors.accent).lineWidth(1).stroke();
      currentY += 10;

      let total = 0;
      const rowHeight = 20;

      if (!snapshot.sources || snapshot.sources.length === 0) {
        doc.fontSize(10).fillColor(colors.secondary).text('No source data available.', leftMargin, currentY);
        currentY += 30;
      } else {
        snapshot.sources.forEach((s: any) => {
          ensureSpace(rowHeight);
          doc.fontSize(10).fillColor(colors.primary);
          doc.text(s.label || s.type, leftMargin, currentY);
          doc.text(formatCurrency(s.impact), leftMargin + 200, currentY, { width: 150, align: 'right' });
          
          const share = snapshot.summary.totalAllTime > 0 ? ((s.impact / snapshot.summary.totalAllTime) * 100).toFixed(1) : '0';
          doc.text(`${share}%`, leftMargin + 350, currentY, { width: contentWidth - 350, align: 'right' });
          
          total += s.impact;
          currentY += rowHeight;
          
          doc.moveTo(leftMargin, currentY - 5).lineTo(leftMargin + contentWidth, currentY - 5).strokeColor(colors.divider).lineWidth(0.5).stroke();
        });

        ensureSpace(rowHeight);
        currentY += 5;
        doc.fontSize(10).fillColor(colors.primary).text('TOTAL', leftMargin, currentY);
        doc.text(formatCurrency(total), leftMargin + 200, currentY, { width: 150, align: 'right' });
        doc.text('100%', leftMargin + 350, currentY, { width: contentWidth - 350, align: 'right' });
        currentY += 40;
      }
    };

    const drawSavingsGrowthChart = () => {
      ensureSpace(280);
      drawSectionTitle('SAVINGS GROWTH & TRENDS');
      
      const chartHeight = 220;
      const chartY = currentY;
      
      doc.rect(leftMargin, chartY, contentWidth, chartHeight).fill('#15181C');
      
      if (!snapshot.growth || snapshot.growth.length === 0) {
         doc.fontSize(10).fillColor(colors.secondary).text('Insufficient data to display trends.', leftMargin, chartY + 100, { align: 'center', width: contentWidth });
      } else {
         // Draw a simple line chart approximation for professional look
         const data = snapshot.growth;
         const maxVal = Math.max(...data.map((d: any) => d.saved || 0), 1);
         const minVal = 0;
         
         const chartInnerX = leftMargin + 40;
         const chartInnerWidth = contentWidth - 60;
         const chartInnerY = chartY + 20;
         const chartInnerHeight = chartHeight - 50;

         // Y-axis ticks
         doc.fontSize(8).fillColor(colors.secondary);
         for(let i=0; i<=4; i++) {
            const val = minVal + (maxVal - minVal) * (i/4);
            const y = chartInnerY + chartInnerHeight - (chartInnerHeight * (i/4));
            
            // Format tick like 50K
            let tickLabel = `₹${(val/1000).toFixed(0)}K`;
            if (val === 0) tickLabel = '0';
            
            doc.text(tickLabel, leftMargin + 5, y - 4, { width: 30, align: 'right' });
            doc.moveTo(chartInnerX, y).lineTo(chartInnerX + chartInnerWidth, y).strokeColor(colors.divider).lineWidth(0.5).stroke();
         }

         // Line
         const stepX = chartInnerWidth / Math.max((data.length - 1), 1);
         
         doc.strokeColor(colors.accent).lineWidth(2);
         let started = false;

         data.forEach((d: any, i: number) => {
            const x = chartInnerX + (i * stepX);
            const y = chartInnerY + chartInnerHeight - (((d.saved || 0) - minVal) / (maxVal - minVal) * chartInnerHeight);
            
            if (!started) {
              doc.moveTo(x, y);
              started = true;
            } else {
              doc.lineTo(x, y);
            }
            
            // X-axis label (only show a few to avoid crowding)
            if (data.length <= 6 || i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) {
              doc.text(d.name || '', x - 20, chartInnerY + chartInnerHeight + 10, { width: 40, align: 'center' });
            }
         });
         
         if (started) {
           doc.stroke();
         }
      }
      
      currentY += chartHeight + 40;
    };

    const drawMonthlySavingsTable = () => {
      ensureSpace(120);
      drawSectionTitle('MONTHLY SAVINGS');

      doc.fontSize(9).fillColor(colors.accent);
      doc.text('MONTH', leftMargin, currentY);
      doc.text('SAVINGS', leftMargin + 200, currentY, { width: contentWidth - 200, align: 'right' });
      
      currentY += 15;
      doc.moveTo(leftMargin, currentY).lineTo(leftMargin + contentWidth, currentY).strokeColor(colors.accent).lineWidth(1).stroke();
      currentY += 10;

      if (!snapshot.monthlySavings || snapshot.monthlySavings.length === 0) {
        doc.fontSize(10).fillColor(colors.secondary).text('No monthly savings recorded.', leftMargin, currentY);
        currentY += 30;
      } else {
        snapshot.monthlySavings.forEach((m: any) => {
          ensureSpace(20);
          doc.fontSize(10).fillColor(colors.primary);
          doc.text(m.monthLabel, leftMargin, currentY);
          doc.text(formatCurrency(m.amount), leftMargin + 200, currentY, { width: contentWidth - 200, align: 'right' });
          currentY += 20;
          doc.moveTo(leftMargin, currentY - 5).lineTo(leftMargin + contentWidth, currentY - 5).strokeColor(colors.divider).lineWidth(0.5).stroke();
        });
        currentY += 30;
      }
    };

    const drawGoalsTable = () => {
      ensureSpace(150);
      drawSectionTitle('SAVINGS GOALS');

      doc.fontSize(8).fillColor(colors.accent);
      
      const colX = [leftMargin, leftMargin + 90, leftMargin + 160, leftMargin + 230, leftMargin + 300, leftMargin + 400];
      
      doc.text('GOAL', colX[0], currentY);
      doc.text('SAVED', colX[1], currentY);
      doc.text('TARGET', colX[2], currentY);
      doc.text('REMAINING', colX[3], currentY);
      doc.text('PROGRESS', colX[4], currentY);
      doc.text('STATUS', colX[5], currentY);
      
      currentY += 15;
      doc.moveTo(leftMargin, currentY).lineTo(leftMargin + contentWidth, currentY).strokeColor(colors.accent).lineWidth(1).stroke();
      currentY += 10;

      const activeGoals = snapshot.goals.filter((g: any) => g.status === 'ACTIVE');
      const rowHeight = 25;

      if (activeGoals.length === 0) {
        doc.fontSize(10).fillColor(colors.secondary).text('No active goals.', leftMargin, currentY);
        currentY += 30;
      } else {
        activeGoals.forEach((g: any) => {
          ensureSpace(35);
          
          doc.fontSize(9).fillColor(colors.primary);
          
          let goalName = g.name || 'Unnamed';
          if (goalName.length > 15) goalName = goalName.substring(0, 12) + '...';

          doc.text(goalName, colX[0], currentY, { width: 80 });
          doc.text(formatCurrency(g.savedAmount || 0), colX[1], currentY, { width: 65 });
          doc.text(formatCurrency(g.targetAmount || 0), colX[2], currentY, { width: 65 });
          doc.text(formatCurrency(Math.max((g.targetAmount || 0) - (g.savedAmount || 0), 0)), colX[3], currentY, { width: 65 });
          
          const progressPct = Math.min(Math.floor(g.progress || 0), 100);
          
          // Draw small progress bar
          const barWidth = 60;
          doc.rect(colX[4], currentY + 2, barWidth, 6).fill('#15181C');
          if (progressPct > 0) {
            doc.rect(colX[4], currentY + 2, barWidth * (progressPct / 100), 6).fill(colors.primary);
          }
          doc.fontSize(8).fillColor(colors.secondary).text(`${progressPct}%`, colX[4] + barWidth + 5, currentY);
          
          doc.fontSize(9).fillColor(colors.accent).text(g.status || 'ACTIVE', colX[5], currentY);
          
          currentY += rowHeight;
          doc.moveTo(leftMargin, currentY - 5).lineTo(leftMargin + contentWidth, currentY - 5).strokeColor(colors.divider).lineWidth(0.5).stroke();
        });
        currentY += 20;
      }
      
      // Completed goals
      const completedGoals = snapshot.goals.filter((g: any) => g.status === 'COMPLETED');
      if (completedGoals.length > 0) {
        ensureSpace(80);
        doc.fontSize(12).fillColor(colors.primary).text('COMPLETED GOALS', leftMargin, currentY);
        currentY += 15;
        
        doc.fontSize(8).fillColor(colors.accent);
        doc.text('GOAL', leftMargin, currentY);
        doc.text('TARGET', leftMargin + 200, currentY);
        doc.text('COMPLETED DATE', leftMargin + 350, currentY);
        currentY += 12;
        doc.moveTo(leftMargin, currentY).lineTo(leftMargin + contentWidth, currentY).strokeColor(colors.divider).lineWidth(1).stroke();
        currentY += 8;
        
        completedGoals.forEach((g: any) => {
          ensureSpace(20);
          doc.fontSize(9).fillColor(colors.secondary);
          doc.text(g.name || 'Unnamed', leftMargin, currentY);
          doc.text(formatCurrency(g.targetAmount || 0), leftMargin + 200, currentY);
          doc.text(new Date(g.updatedAt || g.createdAt).toLocaleDateString('en-GB'), leftMargin + 350, currentY);
          currentY += 15;
        });
        currentY += 30;
      }
    };

    const drawTransactionsTable = () => {
      addPage(); // Transactions usually start on a fresh page
      drawSectionTitle('SAVINGS TRANSACTIONS');

      // Unassigned
      const unassignedTotal = snapshot.transactions.filter((t: any) => !t.goalId).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      doc.fontSize(10).fillColor(colors.primary).text('UNASSIGNED SAVINGS');
      doc.text(formatCurrency(unassignedTotal), leftMargin + 200, currentY - 12);
      currentY += 10;

      const drawTxHeader = () => {
        ensureSpace(30);
        doc.fontSize(8).fillColor(colors.accent);
        doc.text('DATE', leftMargin, currentY, { width: 70 });
        doc.text('NAME / NOTE', leftMargin + 70, currentY, { width: 140 });
        doc.text('SOURCE', leftMargin + 210, currentY, { width: 70 });
        doc.text('GOAL', leftMargin + 280, currentY, { width: 100 });
        doc.text('AMOUNT', leftMargin + 380, currentY, { width: contentWidth - 380, align: 'right' });
        
        currentY += 15;
        doc.moveTo(leftMargin, currentY).lineTo(leftMargin + contentWidth, currentY).strokeColor(colors.accent).lineWidth(1).stroke();
        currentY += 10;
      };

      drawTxHeader();

      if (!snapshot.transactions || snapshot.transactions.length === 0) {
        doc.fontSize(10).fillColor(colors.secondary).text('No transactions found.', leftMargin, currentY);
        currentY += 30;
      } else {
        snapshot.transactions.forEach((tx: any) => {
          // Check if we need a new page and redraw header
          if (ensureSpace(25)) {
            drawTxHeader();
          }

          const txDate = new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          let nameNote = tx.name || '';
          if (tx.note) nameNote += ` - ${tx.note}`;
          if (nameNote.length > 30) nameNote = nameNote.substring(0, 27) + '...';
          
          let goalName = '—';
          if (tx.goalId && snapshot.goals) {
            const found = snapshot.goals.find((g: any) => g.id === tx.goalId);
            if (found) {
               goalName = found.name;
               if (goalName.length > 18) goalName = goalName.substring(0, 15) + '...';
            }
          }

          doc.fontSize(9).fillColor(colors.primary);
          doc.text(txDate, leftMargin, currentY, { width: 70 });
          doc.text(nameNote, leftMargin + 70, currentY, { width: 140 });
          doc.text(tx.source || 'OTHER', leftMargin + 210, currentY, { width: 70 });
          doc.text(goalName, leftMargin + 280, currentY, { width: 100 });
          doc.text(formatCurrency(tx.amount || 0), leftMargin + 380, currentY, { width: contentWidth - 380, align: 'right' });
          
          currentY += 20;
          doc.moveTo(leftMargin, currentY - 5).lineTo(leftMargin + contentWidth, currentY - 5).strokeColor(colors.divider).lineWidth(0.5).stroke();
        });
        currentY += 30;
      }
    };

    const drawFinalInsights = () => {
      ensureSpace(120);
      drawSectionTitle('SAVINGS INSIGHTS');

      doc.fontSize(10).fillColor(colors.secondary);
      doc.text('Total savings:', leftMargin, currentY);
      doc.fillColor(colors.primary).text(formatCurrency(snapshot.summary.totalAllTime || 0), leftMargin + 150, currentY);
      currentY += 20;

      let largestSource = 'None';
      if (snapshot.sources && snapshot.sources.length > 0) {
        const sorted = [...snapshot.sources].sort((a: any, b: any) => b.impact - a.impact);
        largestSource = sorted[0].label || sorted[0].type;
      }
      doc.fillColor(colors.secondary).text('Largest source:', leftMargin, currentY);
      doc.fillColor(colors.primary).text(largestSource, leftMargin + 150, currentY);
      currentY += 20;

      const activeGoals = snapshot.goals.filter((g: any) => g.status === 'ACTIVE').length;
      doc.fillColor(colors.secondary).text('Active goals:', leftMargin, currentY);
      doc.fillColor(colors.primary).text(activeGoals.toString(), leftMargin + 150, currentY);
      currentY += 20;
      
      const completedGoals = snapshot.goals.filter((g: any) => g.status === 'COMPLETED').length;
      doc.fillColor(colors.secondary).text('Completed goals:', leftMargin, currentY);
      doc.fillColor(colors.primary).text(completedGoals.toString(), leftMargin + 150, currentY);
      currentY += 40;
    };

    const drawReportNote = () => {
      ensureSpace(40);
      doc.fontSize(9).fillColor(colors.accent).text('REPORT NOTE', leftMargin, currentY);
      currentY += 15;
      doc.fontSize(8).fillColor(colors.secondary).text('This report is generated from the financial records available in FinWise AI at the time of generation.', leftMargin, currentY);
    };

    // Build Document
    addPage();
    drawCoverTitle();
    
    // Page 1 blocks
    drawMetricGrid();
    
    // Test if we can fit both summary and sources on page 1
    // A standard page is ~841. We start ~160. Metric grid takes ~200.
    // If not, ensureSpace will automatically page break them appropriately.
    drawSummaryTable();
    drawSourceBreakdown();
    
    // Page 2 typically
    if (currentY > topMargin + 100) addPage(); // Force page 2 for chart if page 1 has stuff
    drawSavingsGrowthChart();
    drawMonthlySavingsTable();
    drawGoalsTable();

    // Page 3 typically
    drawTransactionsTable();
    
    drawFinalInsights();
    drawReportNote();

    drawFooter();

    doc.end();
  }
}
