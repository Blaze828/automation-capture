const readline = require('node:readline');
const input = readline.createInterface({ input: process.stdin, output: process.stdout });
input.question('이름을 입력하세요: ', name => {
  console.log(`안녕하세요, ${name}님!`);
  input.close();
});
