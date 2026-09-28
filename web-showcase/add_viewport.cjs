const fs = require('fs');
const files = [
  'about-us.html', 'design-solutions.html', 'v-odne1s.html', 'bobart.html',
  'ltb-valve-techno.html', 'career.html', 'contact.html'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('viewport')) {
    content = content.replace('<head>', '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />');
    fs.writeFileSync(file, content);
  }
});
