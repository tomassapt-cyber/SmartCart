const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const root=__dirname;
const target=path.resolve(process.argv[2]||path.join(root,'resilient-push.sh')).replaceAll('\\','/');
const bash=process.env.TEST_BASH || (process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash');
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
      assert.ok(result.stderr.includes(marker),'failure operation was not reached');
      const after=result.stderr.split(marker).slice(1).join(marker);
      assert.ok(!after.includes('git:push'),`${fail}: published after failed operation`);
    }
    console.log(`PASS ${fail}`);
  }catch(e){console.error(`FAIL ${fail}: ${e.message}`);failures++;}
}
// Caminho rápido (2026-10-22): o main mudou sem conflito → o rebase basta e o
// push passa SEM re-integrar; com conflito no rebase → re-integra como antes.
for (const [nome, rebaseFalha] of [['rebase-limpo', false], ['rebase-conflito', true]]) {
  const runner=`
  rebased=0; committed=0
  sleep() { :; }
  mktemp() { echo /fixture-tmp; }
  rm() { :; }
  node() { return 0; }
  git() {
    echo "git:$1" >&2
    case "$1" in
      push) [ "$rebased" -eq 1 ] || [ "$committed" -eq 1 ]; return $?;;
      rebase) [ "$2" = --abort ] && return 0; ${rebaseFalha ? 'return 1' : 'rebased=1; return 0'};;
      diff) return 1;;
    esac
    [ "$1" != commit ] || committed=1
    return 0
  }
  bash() { echo "seed:$2" >&2; return 0; }
  integrate() { echo integrate >&2; return 0; }
  source '${target}' integrate fixture-commit
  `;
  const result=cp.spawnSync(bash,['--noprofile','--norc','-c',runner],{encoding:'utf8',env:{...process.env,GITHUB_REF_NAME:'main',MSYS_NO_PATHCONV:'1'}});
  try{
    assert.equal(result.status,0,`${nome}: exit ${result.status}`);
    if(!rebaseFalha){
      assert.ok(!result.stderr.includes('integrate'),'rebase-limpo: não devia re-integrar');
      assert.ok(result.stderr.includes('git:rebase'),'rebase-limpo: não tentou o rebase');
    } else {
      assert.ok(result.stderr.includes('git:rebase')&&result.stderr.includes('integrate'),'rebase-conflito: devia re-integrar depois do conflito');
    }
    console.log(`PASS ${nome}`);
  }catch(e){console.error(`FAIL ${nome}: ${e.message}`);failures++;}
}
process.exitCode=failures?1:0;
