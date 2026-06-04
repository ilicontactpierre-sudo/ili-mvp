const fs = require('fs');
const sounds = JSON.parse(fs.readFileSync('./public/sounds/sounds-index.json'));
const total = sounds.length;
const withTags = sounds.filter(s => s.tags && s.tags.length > 0).length;
const withSearch = sounds.filter(s => s.searchString && s.searchString.trim() !== '').length;
const withDesc = sounds.filter(s => s.description && s.description.trim() !== '').length;
const withAny = sounds.filter(s =>
  (s.tags && s.tags.length > 0) ||
  (s.searchString && s.searchString.trim() !== '') ||
  (s.description && s.description.trim() !== '')
).length;
const withNone = total - withAny;
console.log('Total sons:', total);
console.log('Avec tags:', withTags, '(' + Math.round(withTags/total*100) + '%)');
console.log('Avec searchString:', withSearch, '(' + Math.round(withSearch/total*100) + '%)');
console.log('Avec description:', withDesc, '(' + Math.round(withDesc/total*100) + '%)');
console.log('Avec au moins un champ:', withAny, '(' + Math.round(withAny/total*100) + '%)');
console.log('Sans aucun champ (label seul):', withNone, '(' + Math.round(withNone/total*100) + '%)');