/* Countries and dialling codes for the storefront forms.
 *
 * The ones we actually ship to and are asked about most sit at the top of the
 * list; the rest follow alphabetically. A checkout that opens on "Afghanistan"
 * makes every Indian client scroll past 90 countries to find their own.
 */
(function (w) {
  "use strict";

  var PRIORITY = ["IN", "AE", "TZ", "GB", "US", "SG", "CH", "FR", "IT", "HK"];

  var LIST = [
    ["AF","Afghanistan","+93"],["AL","Albania","+355"],["DZ","Algeria","+213"],
    ["AR","Argentina","+54"],["AM","Armenia","+374"],["AU","Australia","+61"],
    ["AT","Austria","+43"],["AZ","Azerbaijan","+994"],["BH","Bahrain","+973"],
    ["BD","Bangladesh","+880"],["BE","Belgium","+32"],["BR","Brazil","+55"],
    ["BG","Bulgaria","+359"],["KH","Cambodia","+855"],["CA","Canada","+1"],
    ["CL","Chile","+56"],["CN","China","+86"],["CO","Colombia","+57"],
    ["HR","Croatia","+385"],["CY","Cyprus","+357"],["CZ","Czechia","+420"],
    ["DK","Denmark","+45"],["EG","Egypt","+20"],["EE","Estonia","+372"],
    ["ET","Ethiopia","+251"],["FI","Finland","+358"],["FR","France","+33"],
    ["GE","Georgia","+995"],["DE","Germany","+49"],["GH","Ghana","+233"],
    ["GR","Greece","+30"],["HK","Hong Kong","+852"],["HU","Hungary","+36"],
    ["IS","Iceland","+354"],["IN","India","+91"],["ID","Indonesia","+62"],
    ["IE","Ireland","+353"],["IL","Israel","+972"],["IT","Italy","+39"],
    ["JP","Japan","+81"],["JO","Jordan","+962"],["KZ","Kazakhstan","+7"],
    ["KE","Kenya","+254"],["KW","Kuwait","+965"],["LV","Latvia","+371"],
    ["LB","Lebanon","+961"],["LT","Lithuania","+370"],["LU","Luxembourg","+352"],
    ["MY","Malaysia","+60"],["MV","Maldives","+960"],["MT","Malta","+356"],
    ["MU","Mauritius","+230"],["MX","Mexico","+52"],["MA","Morocco","+212"],
    ["MZ","Mozambique","+258"],["NP","Nepal","+977"],["NL","Netherlands","+31"],
    ["NZ","New Zealand","+64"],["NG","Nigeria","+234"],["NO","Norway","+47"],
    ["OM","Oman","+968"],["PK","Pakistan","+92"],["PH","Philippines","+63"],
    ["PL","Poland","+48"],["PT","Portugal","+351"],["QA","Qatar","+974"],
    ["RO","Romania","+40"],["RU","Russia","+7"],["RW","Rwanda","+250"],
    ["SA","Saudi Arabia","+966"],["RS","Serbia","+381"],["SG","Singapore","+65"],
    ["SK","Slovakia","+421"],["SI","Slovenia","+386"],["ZA","South Africa","+27"],
    ["KR","South Korea","+82"],["ES","Spain","+34"],["LK","Sri Lanka","+94"],
    ["SE","Sweden","+46"],["CH","Switzerland","+41"],["TW","Taiwan","+886"],
    ["TZ","Tanzania","+255"],["TH","Thailand","+66"],["TN","Tunisia","+216"],
    ["TR","Türkiye","+90"],["UG","Uganda","+256"],["UA","Ukraine","+380"],
    ["AE","United Arab Emirates","+971"],["GB","United Kingdom","+44"],
    ["US","United States","+1"],["UZ","Uzbekistan","+998"],["VN","Vietnam","+84"],
    ["ZM","Zambia","+260"],["ZW","Zimbabwe","+263"]
  ].map(function (c) { return { code: c[0], name: c[1], dial: c[2] }; });

  var byCode = {};
  LIST.forEach(function (c) { byCode[c.code] = c; });

  function sorted() {
    var top = PRIORITY.map(function (k) { return byCode[k]; }).filter(Boolean);
    var rest = LIST.filter(function (c) { return PRIORITY.indexOf(c.code) === -1; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    return { top: top, rest: rest };
  }

  /* Both selects are built from the same list, so a country and its dialling
     code can never drift apart. */
  function fillCountry(sel, selected) {
    var s = sorted();
    function opt(c) {
      return '<option value="' + c.code + '"' +
        (c.code === selected ? " selected" : "") + ">" + c.name + "</option>";
    }
    sel.innerHTML =
      '<optgroup label="Where we are">' + s.top.map(opt).join("") + "</optgroup>" +
      '<optgroup label="Everywhere else">' + s.rest.map(opt).join("") + "</optgroup>";
  }

  function fillDial(sel, selected) {
    var s = sorted();
    function opt(c) {
      return '<option value="' + c.dial + '" data-code="' + c.code + '"' +
        (c.code === selected ? " selected" : "") + ">" +
        c.code + " " + c.dial + "</option>";
    }
    sel.innerHTML =
      '<optgroup label="Where we are">' + s.top.map(opt).join("") + "</optgroup>" +
      '<optgroup label="Everywhere else">' + s.rest.map(opt).join("") + "</optgroup>";
  }

  w.GemCountries = { LIST: LIST, byCode: byCode, fillCountry: fillCountry, fillDial: fillDial };
})(window);
