import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sourcePath =
  'data/v2/examples/player-show-complete-cue-tracks/player.be'
const sourceBytes = Buffer.byteLength(readFileSync(sourcePath, 'utf8'))

// TnglCompiler encodes BERRY_SCRIPT flag + uint16 length + source bytes and
// the surrounding TNGL stream adds END_OF_TNGL_BYTES.
const tnglBytes = 1 + 2 + sourceBytes + 1
assert.ok(tnglBytes <= 4096, `Player TNGL is ${tnglBytes} bytes (>4096)`)

console.log(
  `player.show plugin size: ${sourceBytes} source bytes, ${tnglBytes} TNGL bytes, ${tnglBytes - 1024} bytes above the 1024-byte stretch target`,
)
