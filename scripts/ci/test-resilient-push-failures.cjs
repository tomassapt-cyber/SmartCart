const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const root=__dirname;
const target=path.resolve(process.argv[2]||path.join(root,'resilient-push.sh')).replaceAll('\\','/');
const bash=process.env.TEST_BASH || 'C:/Program Files/Git/bin/bash.exe';
let failures=0;
for(const fail of ['none','fetch','reset','unpack','integrate','pack','add','commit']){
  const runner=`
  pushes=0; committed=0
  sleep() { :; }
  mktemp() { echo /fixture-tmp; }
  rm() { :; }
  git() {
    echo "git:$1" >&2
    case "$1" in
      push) pushes=$((pushes+1)); [ "$committed" -eq 1 ]; return $?;;
      fetch|reset|add|commit) [ "$1" != '${fail}' ] || return 7;;
      diff) return 1;;
    esac
    [ "$1" != commit ] || committed=1
    return 0
  }
  bash() { echo "seed:$2" >&2; [ "$2" != '${fail}' ]; }
  integrate() { echo integrate >&2; [ '${fail}' != integrate ]; }
  source '${target}' integrate fixture-commit
  `;
  const result=cp.spawnSync(bash,['--noprofile','--norc','-c',runner],{encoding:'utf8',env:{...process.env,GITHUB_REF_NAME:'main',MSYS_NO_PATHCONV:'1'}});
  const all=result.stdout+result.stderr;
  try{
    if(fail==='none') assert.equal(result.status,0);
    else assert.ok(result.status !== null && result.status !== 0,`${fail}: unexpected exit ${result.status}`);
    if(fail!=='none'){
      const marker=fail==='unpack'||fail==='pack'?`seed:${fail}`:fail==='integrate'?'integrate':`git:${fail}`;
      const after=result.stderr.split(marker).slice(1).join(marker);
      assert.ok(!after.includes('git:push'),`${fail}: published after failed operation`);
    }
    console.log(`PASS ${fail}`);
  }catch(e){console.error(`FAIL ${fail}: ${e.message}`);failures++;}
}
process.exitCode=failures?1:0;
