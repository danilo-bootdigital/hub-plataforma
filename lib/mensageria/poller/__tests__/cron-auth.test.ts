// Testes do validador de CRON_SECRET (DEC-023 · Fatia 0). node:test, puro.

import test from 'node:test'
import assert from 'node:assert/strict'
import { validarCronSecret } from '../cron-auth'

test('secret não configurado → false (fail-closed)', () => {
  assert.equal(validarCronSecret('Bearer x', undefined), false)
  assert.equal(validarCronSecret('Bearer x', ''), false)
})

test('header ausente → false', () => {
  assert.equal(validarCronSecret(null, 's3cr3t'), false)
  assert.equal(validarCronSecret(undefined, 's3cr3t'), false)
})

test('header correto → true', () => {
  assert.equal(validarCronSecret('Bearer s3cr3t', 's3cr3t'), true)
})

test('secret errado (mesmo tamanho) → false', () => {
  assert.equal(validarCronSecret('Bearer aaaaaa', 'bbbbbb'), false)
})

test('formato/tamanho diferente → false', () => {
  assert.equal(validarCronSecret('s3cr3t', 's3cr3t'), false)          // sem "Bearer "
  assert.equal(validarCronSecret('Bearer s3cr3t extra', 's3cr3t'), false)
})
