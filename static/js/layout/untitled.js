function isfloat(s) {
	console.log("-------------");
	console.log(s);
 	if ((typeof(s)) !=="string") {
    		return 0;
  	}
	s = s.trim();

	isNegative = 0;
	while (s.length > 0 && s[0] !== "" && !myIsNumber(s[0]) && s[0] !== ".") {
		if (s[0] === "-" || s[0] === "+"){
			if (s[0] === "-") isNegative++;
		} else {
			isNegative = 0;
		}
		s = s.substring(1);
	}

	var dotCounter = 0;
	var docPos = 0;
	var res = 0;
	for(i=0;i<s.length;++i){	
		if(s[i] != '.' && !myIsNumber(s[i])){
		    break;
		}

		if (s[i] === ".") {
			dotCounter++;
			dotPos = i;
			continue;
		} 
		if (myIsNumber(s[i])) {
	        	if (dotCounter === 0) {
				res = res * 10 + Number(s[i]);
			} else if (dotCounter === 1) {
				res  = res + Number(s[i]) * Math.pow(10, dotPos - i);
			} 
		}
	}
	if (res === 0) return 0;
	return res * Math.pow(-1, isNegative);
}

function myIsNumber(s) {
	return (s.charCodeAt(0) >= "0".charCodeAt(0) && s.charCodeAt(0) <= "9".charCodeAt(0))
}

console.log(isfloat("")) ;             
console.log(isfloat("127"))  ;               
console.log(isfloat(true))   ;              
console.log(isfloat("true"))   ;             
console.log(isfloat(false))       ;          
console.log(isfloat("123.456"))          ;   
console.log(isfloat("      -127    "))      ;
console.log(isfloat("NaN"))                 ;
console.log(isfloat("NaNanananaBATMAN"))    ;
console.log(isfloat("-iNF"))                ;
console.log(isfloat("123.E4"))              ;
console.log(isfloat(".1"))                  ;
console.log(isfloat("1,234"))               ;
console.log(isfloat("NULL"))                ;
console.log(isfloat("6e7777777777777"))     ;
console.log(isfloat("1.797693e+308"))       ;
console.log(isfloat("infinity"))            ;;
console.log(isfloat("infinityandBEYOND"))   ;
console.log(isfloat("12.34.56"))            ;
console.log(isfloat("#56"))                 ;
console.log(isfloat("56%"))                 ;
console.log(isfloat("0E0"))                 ;
console.log(isfloat("-5e-5"))               ;
console.log(isfloat("+1e1"))                ;
console.log(isfloat("+1e1^5"))              ;
console.log(isfloat("+1e1.3"))              ;
console.log(isfloat("-+1"))          ;
console.log(isfloat("(1)"))          ;



