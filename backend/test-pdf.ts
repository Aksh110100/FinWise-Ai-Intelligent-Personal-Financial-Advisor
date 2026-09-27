
import { ReportService } from './src/services/report.service';
import { prisma } from './src/config/prisma';
import fs from 'fs';

async function run() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No user found');
    console.log('Generating report for user:', user.id);
    const pdfBuffer = await ReportService.generateSavingsReport(user.id);
    fs.writeFileSync('test.pdf', pdfBuffer);
    console.log('Success!');
  } catch (e) {
    console.error('FAILED:', e);
  } finally {
    await prisma.();
  }
}
run();
