import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sourcePath =
  'data/v2/examples/player-show-complete-cue-tracks/player.be'
const sourceBytes = Buffer.byteLength(readFileSync(sourcePath, 'utf8'))
const invocation =
  'return Player({"base":"player","ids":[1],"debug":false})'

// TnglCompiler encodes BERRY_SCRIPT flag + uint16 length + source bytes and
// the surrounding TNGL stream adds END_OF_TNGL_BYTES.
const tnglBytes = 1 + 2 + sourceBytes + 1
const projectTnglBytes = tnglBytes + 1 + Buffer.byteLength(invocation)
assert.ok(tnglBytes <= 4096, `Player TNGL is ${tnglBytes} bytes (>4096)`)
assert.ok(
  projectTnglBytes <= 4096,
  `Player plus canonical invocation is ${projectTnglBytes} bytes (>4096)`,
)

console.log(
  `player.show plugin size: ${sourceBytes} source bytes, ${tnglBytes} TNGL bytes; canonical Project is ${projectTnglBytes} bytes, ${4096 - projectTnglBytes} bytes below the hard limit and ${projectTnglBytes - 1024} above the stretch target`,
)
