 
module.exports = validation = 
  checkOptions : (options) ->
    allowedLanguages = ["javascript"]
    if options.language and options.language not in allowedLanguages
      throw new Error("Language specified in options is not allowed")