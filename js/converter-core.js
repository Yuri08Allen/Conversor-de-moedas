  function decimalParts(value) {
    const match = String(value)
      .trim()
      .replace(",", ".")
      .match(/^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
    if (!match || (!match[2] && !match[3]))
      throw new TypeError("Valor decimal inválido.");
    let digits = (match[2] || "0") + (match[3] || ""),
      scale = (match[3] || "").length - (Number(match[4]) || 0);
    if (scale < 0) {
      digits += "0".repeat(-scale);
      scale = 0;
    }
    return {
      coefficient: (match[1] === "-" ? -1n : 1n) * BigInt(digits || "0"),
      scale,
    };
  }
  function normalizeAmount(value) {
    let text = String(value ?? "")
      .trim()
      .replace(/\s+/g, "");
    if (!text) return "";
    const commas = (text.match(/,/g) || []).length,
      dots = (text.match(/\./g) || []).length;
    if (commas && dots) {
      const decimal = text.lastIndexOf(",") > text.lastIndexOf(".") ? "," : ".";
      const grouping = decimal === "," ? "." : ",";
      const [whole, fraction, ...rest] = text.split(decimal);
      const groupingPattern =
        grouping === "." ? /^[1-9]\d{0,2}(?:\.\d{3})+$/ : /^[1-9]\d{0,2}(?:,\d{3})+$/;
      if (
        rest.length ||
        !/^\d+$/.test(fraction) ||
        (whole.includes(grouping) && !groupingPattern.test(whole))
      )
        return "";
      text = whole.split(grouping).join("") + "." + fraction;
    } else if (commas) {
      if (commas !== 1) return "";
      text = text.replace(",", ".");
    } else if (dots) {
      if (/^[1-9]\d{0,2}(?:\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
      else if (dots !== 1) return "";
    }
    if (text.startsWith(".")) text = "0" + text;
    return /^\d+(?:\.\d*)?$/.test(text) ? text : "";
  }
  function multiplyDecimal(amount, rate, digits) {
    const precision = Number(digits);
    if (!Number.isInteger(precision) || precision < 0 || precision > 20)
      throw new RangeError("Precisão decimal inválida.");
    const a = decimalParts(amount),
      b = decimalParts(rate);
    if (a.coefficient < 0n)
      throw new RangeError("O valor deve ser zero ou positivo.");
    if (b.coefficient <= 0n)
      throw new RangeError("A taxa precisa ser positiva.");
    const product = a.coefficient * b.coefficient,
      scale = a.scale + b.scale,
      shift = scale - precision;
    let rounded;
    if (shift > 0) {
      const divisor = 10n ** BigInt(shift),
        q = product / divisor,
        r = product % divisor;
      rounded = q + (r * 2n >= divisor ? 1n : 0n);
    } else rounded = product * 10n ** BigInt(-shift);
    const text = String(rounded).padStart(precision + 1, "0");
    return precision
      ? text.slice(0, -precision) + "." + text.slice(-precision)
      : text;
  }
  function swapCurrencies(from, to) {
    return { from: to, to: from };
  }
export { multiplyDecimal, normalizeAmount, swapCurrencies };
