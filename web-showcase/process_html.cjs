const fs = require('fs');
const files = [
  'about-us.html', 'design-solutions.html', 'v-odne1s.html', 'bobart.html',
  'ltb-valve-techno.html', 'career.html', 'contact.html'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('<body>', '<body class="subpage-body">');
  if (!content.includes('subpage.js')) {
    content = content.replace('</body>', '  <script src="/subpage.js"></script>\n</body>');
  }
  fs.writeFileSync(file, content);
});
