import jsPDF from 'jspdf';

interface ReportData {
  user: {
    username?: string;
    displayName?: string;
    email?: string;
    date_joined?: string;
  };
  stats: {
    longestStreak: number;
    totalXP: number;
    totalNotebooks: number;
    totalNotes: number;
    totalDecks: number;
    totalFlashcards: number;
    totalTasks: number;
    totalReviewer: number;
    totalQuiz: number;
    totalSchedule: number;
    totalStudyHours: number;
  };
  userLevel: {
    currentLevel: number;
    currentXP: number;
    xpToNextLevel: number;
  };
  achievements: Array<{
    title: string;
    description: string;
    rarity: string;
  }>;
  recentActivities?: Array<{
    description: string;
    timestamp: string;
    type: string;
  }>;
}

export const generateUserReport = async (data: ReportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;
  const lineHeight = 7;
  const sectionSpacing = 10;

  // Helper function to add a new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to add text with word wrap
  const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = '#000000') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(color);
    
    const maxWidth = pageWidth - (margin * 2);
    const lines = doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string) => {
      checkNewPage(lineHeight);
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  };

  // Helper function to add a section header
  const addSectionHeader = (title: string) => {
    yPosition += sectionSpacing;
    checkNewPage(lineHeight * 2);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#6366f1'); // Indigo color
    doc.text(title, margin, yPosition);
    yPosition += lineHeight + 5;
    
    // Add underline
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 5;
  };

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#1e293b'); // Dark gray
  doc.text('User Activity Report', margin, yPosition);
  yPosition += lineHeight + 5;

  // Generated date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#64748b'); // Gray
  const generatedDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Generated: ${generatedDate}`, margin, yPosition);
  yPosition += sectionSpacing * 2;

  // User Information Section
  addSectionHeader('User Information');
  
  const displayName = data.user.displayName || data.user.username || 'User';
  const email = data.user.email || 'N/A';
  const joinedDate = data.user.date_joined 
    ? new Date(data.user.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  addText(`Name: ${displayName}`, 12, true);
  addText(`Email: ${email}`, 11);
  addText(`Member Since: ${joinedDate}`, 11);
  yPosition += sectionSpacing;

  // Statistics Section
  addSectionHeader('Statistics Overview');
  
  // Create two-column layout for stats
  const statsLeft = [
    { label: 'Current Level', value: data.userLevel.currentLevel },
    { label: 'Total XP', value: data.stats.totalXP.toLocaleString() },
    { label: 'Longest Streak', value: `${data.stats.longestStreak} days` },
    { label: 'Total Notebooks', value: data.stats.totalNotebooks },
    { label: 'Total Notes', value: data.stats.totalNotes },
    { label: 'Total Decks', value: data.stats.totalDecks },
  ];

  const statsRight = [
    { label: 'Total Flashcards', value: data.stats.totalFlashcards },
    { label: 'Completed Tasks', value: data.stats.totalTasks },
    { label: 'Reviewers', value: data.stats.totalReviewer },
    { label: 'Quizzes', value: data.stats.totalQuiz },
    { label: 'Schedules', value: data.stats.totalSchedule },
    { label: 'Study Hours', value: `${data.stats.totalStudyHours}h` },
  ];

  const col1X = margin;
  const col2X = pageWidth / 2 + 10;
  const originalY = yPosition;

  statsLeft.forEach(stat => {
    checkNewPage(lineHeight);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#374151'); // Dark gray
    doc.text(stat.label + ':', col1X, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#000000');
    doc.text(String(stat.value), col1X + 50, yPosition);
    yPosition += lineHeight;
  });

  yPosition = originalY;
  statsRight.forEach(stat => {
    checkNewPage(lineHeight);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#374151');
    doc.text(stat.label + ':', col2X, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#000000');
    doc.text(String(stat.value), col2X + 50, yPosition);
    yPosition += lineHeight;
  });

  yPosition = originalY + (Math.max(statsLeft.length, statsRight.length) * lineHeight) + sectionSpacing;

  // Level Progress
  checkNewPage(lineHeight * 3);
  addText(`Progress to Level ${data.userLevel.currentLevel + 1}:`, 11, true);
  const progressPercent = (data.userLevel.currentXP / data.userLevel.xpToNextLevel * 100).toFixed(1);
  addText(`${data.userLevel.currentXP} / ${data.userLevel.xpToNextLevel} XP (${progressPercent}%)`, 10);
  yPosition += sectionSpacing;

  // Achievements Section
  if (data.achievements && data.achievements.length > 0) {
    addSectionHeader(`Achievements (${data.achievements.length} Unlocked)`);
    
    data.achievements.forEach((achievement, index) => {
      checkNewPage(lineHeight * 4);
      
      // Achievement title with rarity badge
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const rarityColors: { [key: string]: string } = {
        common: '#6b7280',
        rare: '#3b82f6',
        epic: '#a855f7',
        legendary: '#f59e0b'
      };
      doc.setTextColor(rarityColors[achievement.rarity] || '#000000');
      doc.text(`${index + 1}. ${achievement.title}`, margin, yPosition);
      yPosition += lineHeight;
      
      // Achievement description
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#4b5563');
      const descLines = doc.splitTextToSize(achievement.description, pageWidth - (margin * 2) - 10);
      descLines.forEach((line: string) => {
        checkNewPage(lineHeight);
        doc.text(line, margin + 5, yPosition);
        yPosition += lineHeight;
      });
      
      yPosition += 3;
    });
  } else {
    addSectionHeader('Achievements');
    checkNewPage(lineHeight);
    addText('No achievements unlocked yet.', 10);
    yPosition += sectionSpacing;
  }

  // Recent Activities Section (if provided)
  if (data.recentActivities && data.recentActivities.length > 0) {
    addSectionHeader('Recent Activities');
    
    const activitiesToShow = data.recentActivities.slice(0, 20); // Show last 20 activities
    
    activitiesToShow.forEach((activity, index) => {
      checkNewPage(lineHeight * 2);
      
      const activityDate = new Date(activity.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#64748b');
      doc.text(activityDate, margin, yPosition);
      
      doc.setTextColor('#000000');
      const descLines = doc.splitTextToSize(activity.description, pageWidth - (margin * 2) - 40);
      descLines.forEach((line: string, lineIndex: number) => {
        if (lineIndex === 0) {
          doc.text(line, margin + 40, yPosition);
        } else {
          checkNewPage(lineHeight);
          yPosition += lineHeight;
          doc.text(line, margin + 5, yPosition);
        }
      });
      
      yPosition += lineHeight + 3;
    });
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor('#9ca3af');
    doc.text(
      `Page ${i} of ${totalPages} - ProdActivity Report`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `ProdActivity_Report_${displayName.replace(/\s+/g, '_')}_${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
};

