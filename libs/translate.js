'use strict'

var glob = require('glob')
var fs = require('fs')
var path = require('path')
var _ = require('lodash')

global.translations = {}
global.customTranslations = []

_loadTranslations()
global.watcher.watch(global, 'customTranslations', _saveTranslations)

function _loadTranslations () {
  global.botDB.findOne({ _id: 'customTranslations' }, function (err, item) {
    if (err) return global.log.error(err, { fnc: '_loadTranslations' })
    if (_.isNull(item)) return
    global.customTranslations = item.translations
  })
}

function _saveTranslations () {
  global.botDB.update({ _id: 'customTranslations' }, { $set: { translations: global.customTranslations } }, { upsert: true })
}

function Translate (text) {
  if (_.isUndefined(global.translations[global.configuration.getValue('lang')]) && !_.isUndefined(text)) return '{missing_translation: ' + global.configuration.getValue('lang') + '.' + text + '}'
  else if (typeof text === 'object') return global.translations[global.configuration.getValue('lang')][text.root]
  else if (typeof text !== 'undefined') return getTranslation(text)
  else {
    return new Promise(function (resolve, reject) {
      glob('./locales/*.json', function (err, files) {
        if (err) reject(err)
        _.each(files, function (file) {
          global.translations[path.basename(file, '.json')] = JSON.parse(fs.readFileSync(file, 'utf8'))
        })
        resolve(true)
      })
    })
  }
}

function getTranslation (text) {
  try {
    var translated
    var customTranslated = _.find(global.customTranslations, function (o) { return o.key === text })
    if (!_.isNil(customTranslated)) {
      translated = customTranslated.value
    } else {
      translated = text.split('.').reduce((o, i) => o[i], global.translations[global.configuration.getValue('lang')])
    }
    _.each(translated.match(/(\{[\w-.]+\})/g), function (toTranslate) { translated = translated.replace(toTranslate, getTranslation(toTranslate.replace('{', '').replace('}', ''))) })
    return translated
  } catch (err) {
    return '{missing_translation: ' + global.configuration.getValue('lang') + '.' + text + '}'
  }
}

module.exports = Translate
