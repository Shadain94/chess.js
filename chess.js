//var boardPieces;
var game;
var pieceIds;
var file = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
var order = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
var moveHistory;
var pieceTypes = ['-', 'P', 'N', 'B', 'R', 'Q', 'K'];
var gameNotation;
var boardTable = {};
var noPiece = 0;
var numSquares = 64;

var rookPaths = [-8, -1, 1, 8];
var bishopPaths = [-9, -7, 7, 9];
var queenPaths = [-9, -8, -7, -1, 1, 7, 8, 9];
var kingPaths = [-9, -8, -7, -1, 1, 7, 8, 9];
var knightPaths = [-17,-15,-10,-6, 6, 10, 15, 17];
var pieceValues = [0, 1, 3, 3.25, 5, 9, 39.5]; 

var bestMoves;
var moveTable = {};
var numCalls = {eval:0,evalM:0, p:0, k:0, n:0, moves:0, check:0, umt:0, umtm:0, fcp:0, upInit:0, upFinal:0, fcpm:0};
var currentSide, pendingMove;
function init(){
	moveHistory=[];
	gameNotation = [];
	boardTable = {};
	posTable = [];
	currentSide=1;
	pendingMove = false;
	pieceIds = [];
	for(var i=0; i<8; i++){
		pieceIds[i] = pieceToNum(order[i], 1);
		pieceIds[i+8] 	= 1;

		pieceIds[i+16] 	= 0;
		pieceIds[i+24] 	= 0;
		pieceIds[i+32] 	= 0;
		pieceIds[i+40] 	= 0;

		pieceIds[i+48] 	= -1;
		pieceIds[i+56] = pieceToNum(order[i], -1);
	}
	

	game = [pieceIds.slice()];
	setupBoard(pieceIds);
	updateStatus();
}

function pieceToNum(type, side){
	var typeNum;
	switch(type){
		case "P":typeNum = 1; break;
		case "N": typeNum = 2; break;
		case "B": typeNum = 3; break;
		case "R": typeNum = 4; break;
		case "Q": typeNum = 5; break;
		case "K": typeNum = 6; break;
	}
	return typeNum*side;
}
function undo(){
	document.getElementById("moves").innerHTML="";
	if(game.length>1){
		currentSide = -currentSide;
		game.pop();
		if(currentSide==1){
			gameNotation.pop();
		}else{
			gameNotation[gameNotation.length-1][1] = "";
		}

		moveHistory.pop();
		pieceIds = game[game.length-1];
		setupBoard(pieceIds);
		updateStatus();
	}
}
function play(){
    var level = parseInt(document.getElementById("level").value);
	bestMoves = findBestMoves(pieceIds, currentSide, level, -100, 100);
	if(bestMoves.length>0){
		var bestMove = bestMoves[Math.floor(bestMoves.length*Math.random())];
		applyMove(bestMove[0]);
	}
	updateStatus();
	if(Object.keys(boardTable).length>1000000){
		boardTable = {};
	}
	if(Object.keys(moveTable).length>1000000){
		moveTable = {};
	}
	
	document.getElementById("pending").style.visibility = "hidden";
}

function findValidMoves(pieceIds, noCheckAllowed){
	var validMoves = [];
	for(var i=0; i<numSquares; i++){
		validMoves.push(findValidPieceMoves(pieceIds,i,noCheckAllowed));
	}
	return validMoves;
}

function startGame(){
    init();
    doPlay();
}

function doPlay(){
    var compPlayer= document.getElementById("compPlayer").value;
    
    if(compPlayer==currentSide || compPlayer==2){
        document.getElementById("pending").style.visibility = "visible";
        setTimeout(play, 200);
    }else{
        document.getElementById("pending").style.visibility = "hidden";
    }
}

function groupPieceIdsByType(pieceIds){
	var types = [[],[],[],[],[],[]];
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]!=0){
			types[Math.abs(pieceIds[i]) - 1].push(i);
		}
	}
	return types;
}

function evaluateScore(pieceIds, side){
	var scores = evaluateBoard(pieceIds);
	var score;
	score = (scores[0] - scores[1])*side;	
	return score;
}

function findAllPieceMoves(pieceIds, position, pieceId){
	var typeId = Math.abs(pieceId);
	var pos = position;
	var positions = [];
	var vectors, p;
	var possibleMove;
	var numPaths;
	switch(typeId){
		case 1: vectors = [typeId*8,16*typeId,8*typeId-1,typeId*8+1]; numPaths = 4; break;
		case 2: vectors = knightPaths; numPaths = 8; break;
		case 3: vectors = bishopPaths; numPaths = 4; break;
		case 4: vectors = rookPaths; numPaths = 4; break;
		case 5: 
		case 6: 
			vectors = queenPaths; numPaths = 8; break;
	}
	
	switch(typeId){
		case 3:
		case 4:
		case 5:
			for(var i=0; i<numPaths; i++){
				pos = position;
				p = noPiece;
				while(pos!==-1 && p===noPiece){
					pos = adjustPosition(pos, vectors[i]);
					p = pieceIds[pos];
					if(pos!==-1){
						positions.push(pos);
					}
				}
			}
			break;
		case 1:
		case 2:
		case 6:
			for(var i=0; i<numPaths; i++){
				possibleMove = adjustPosition(pos, vectors[i]);
				if(possibleMove!==-1){
					positions.push(possibleMove);
				}
			}	
			break;
    }	
	return positions;
}

function checkRelations(posArray, pieceType){
  var valid;
  var numPos = posArray.length;
	if(pieceType==='R'){
		valid = true;
		for(var i=1; i<numPos; i++){
			if(posArray[i]%8!=posArray[0]%8){valid=false; break;}
		}
		if(!valid){
			valid = true;
			for(var i=1; i<numPos; i++){
				if(posArray[i]>>3!=posArray[0]>>3){valid=false; break;}
			}
		}
		return valid;
	}else if(pieceType==='B'){
		valid = true;
		for(var i=1; i<numPos; i++){
			if(posArray[i]%8 + posArray[i]>>3 !== posArray[0]%8 + posArray[0]>>3){valid=false; break;}
		}
		if(!valid){
			valid = true;
			for(var i=1; i<numPos; i++){
				if(posArray[i]%8 + posArray[i]>>3 !== posArray[0]%8 + posArray[0]>>3){valid=false; break;}
			}
		}
		return valid;
	}else if(pieceType==='Q'){
		return checkRelations(posArray, 'R') || checkRelations(posArray, 'B');
	}else{
		return false;
	}
	
}


function generateMoveList(pieceIds, side){
	var moveList = [];
	for(var i=0; i<numSquares; i++){
		var pieceId = pieceIds[i]
		if(pieceId*side>0){
			var options = findValidPieceMoves(pieceIds, i, true); 
			var moves = options[0];
			var captures = options[1];
			for(var j=0; j<moves.length; j++){
				moveList.push({origin:i, dest:moves[j], pieceId:pieceId});
			}
			for(var j=0; j<captures.length; j++){
				moveList.push({origin:i, dest:captures[j], pieceId:pieceId});
			}
		}
	}
	return moveList;
}

function genControllingList(pieceIds){
	var controllingPieces = [];
	var allMoves;
	var pieceId;
	for(var i=0; i<numSquares; i++){
		controllingPieces[i] = [];
	}
	for(var i=0; i<numSquares; i++){
		pieceId = pieceIds[i];
		if(pieceId!==0){
			allMoves =  findAllPieceMoves(pieceIds, i, pieceId);
			for(var j=0; j<allMoves.length; j++){
				controllingPieces[allMoves[j]].push(i);
			}
		}
	}
	return controllingPieces;
}

function copyArr(arr){
	var arr2 = [];
	var arrLength = arr.length;
	for(var i=0; i<arrLength; i++){
		arr2[i] = arr[i];
	}
	return arr2;
}

function findBestMoves(pieceIds, side, depth, a, b){
	var bestScore = -1000;
	var bestMoves = [];
	var newScore;
	var replies;
	var pieceIds2 = [];
	var validMoves2;
	var pieceId;
	var validMoves;
	var controllingList;
	if(depth<=1){
		//controllingList = genControllingList(pieceIds);
		//validMoves = findValidMoves(pieceIds, false);
	}
	var moveList = generateMoveList(pieceIds,side);
	
	for(var i=0; i<moveList.length; i++){	
		pieceIds2 = copyArr(pieceIds);
		if(depth<=1){
			//validMoves2 = copyArr(validMoves);
		}
		makeMove(pieceIds2, moveList[i], controllingList, validMoves2);
		if(depth>1){
			replies = findBestMoves(pieceIds2,-side, depth-1, -b, -a);
			if(replies.length>0){
				newScore = - replies[0][1];
			}else{
				if(detectCheck(pieceIds2, -side)){
					newScore = 1000;
				}else{
					newScore = 0;
				}
				
			}
		}else{
			newScore = evaluateScore(pieceIds2, side);
		}
		if(newScore>bestScore){
			bestScore = newScore;
			bestMoves = [];
		}
		if(newScore>=bestScore){
			bestMoves.push([moveList[i], newScore]);
		}
		if(bestScore>a){a = bestScore;}
		if(a>b){ return bestMoves;}				
	}
	return bestMoves;	
}
function updateStatus(){
	var scores = deepEvaluation(pieceIds);
	var notationStr = "";
	for(var i=0; i<gameNotation.length; i++){
		notationStr+=(i+1)+". "+gameNotation[i][0]+" "+gameNotation[i][1]+" ";
	}	
	document.getElementById("history").innerHTML = notationStr;
	document.getElementById("scores").innerHTML="White: "+scores[0]+", Black: "+scores[1];
	if(detectCheck(pieceIds,1) || detectCheck(pieceIds, -1)){
		if(scores[0]===0){
			document.getElementById("status").innerHTML="Checkmate! Black wins!";
		}else if(scores[1]===0){
			document.getElementById("status").innerHTML="Checkmate! White wins!";
		}else{
			document.getElementById("status").innerHTML="Check!";
		}
	}else{
		if(scores[0]===0 || scores[1]===0){
			document.getElementById("status").innerHTML="Stalemate!";
		}else{
			document.getElementById("status").innerHTML="";
		}
	}
}


function highlightMoves(rays){
	document.getElementById("moves").innerHTML="";
	var moves;
	for(var i=0; i<rays.length; i++){
		moves = rays[i];
		for(var j=0; j<moves.length;j++){
			var left = (8+52*(moves[j]%8)).toString();
			var top = (7*52 + 8-52*(moves[j]>>3)).toString();
			document.getElementById("moves").innerHTML+='<div style="position:absolute; left:'+left+'px;top:'+top+'px; height:52px; width:52px; background-color: rgba(255, 255, 0, 0.2)"></div>';
		}
	}
}
function getCell(x, y){
	var row = Math.ceil((7*52 - y+10)/52);
	var col = Math.floor((x-10)/52);
	return col+row*8;
}
function findCol(c){
	switch(c){
		case "a": return 0;
		case "b": return 1;
		case "c": return 2;
		case "d": return 3;
		case "e": return 4;
		case "f": return 5;
		case "g": return 6;
		case "h": return 7;
	}
}


function makeMove(pieceIds, move, controllingList, validMoves){
	var captureMade = false;
	var id = move.pieceId;
	var side = Math.sign(id);
	var type = Math.abs(id);
	var updateValidMoves = controllingList!=null;
	pieceIds[move.origin] = noPiece;
	if(pieceIds[move.dest]!==noPiece){
		captureMade = true;
	}
	pieceIds[move.dest] = move.pieceId;
	

	if(type===pieceToNum("P", 1) && !captureMade && (Math.abs(move.origin - move.dest)===7 || Math.abs(move.origin - move.dest)===9)){
		pieceIds[(move.origin>>3)<<3 + move.dest%8] = noPiece;
		if(updateValidMoves){
			validMoves[(move.origin>>3)<<3 + move.dest%8] = [];
		}
	}
	
	var rank = 28 - 28*side;
	if(move.origin === 4 + rank && move.dest === 2 + rank && type===pieceToNum("K", 1)){
		pieceIds[rank] = noPiece;
		pieceIds[3+rank] = pieceToNum("R", side);
		if(updateValidMoves){
			validMoves[rank] = [];
			validMoves[3+rank] = findValidPieceMoves(pieceIds,3+rank, false);
		}
	}	
	if(move.origin===4+rank && move.dest===6+rank && type===pieceToNum("K", 1)){
		pieceIds[7+rank] = noPiece;
		pieceIds[5+rank] = pieceToNum("R", side);
		if(updateValidMoves){
			validMoves[7+rank] = [];
			validMoves[5+rank] = findValidPieceMoves(pieceIds,5+rank, false);
		}
	}
	if(move.dest>>3<<3===rank){
		if(type===pieceToNum("P",1)){
			pieceIds[move.dest] = pieceToNum("Q", side);
		}
	}
	if(updateValidMoves){
		validMoves[move.origin] = [];
		var initPieces = controllingList[move.origin];
		for(var i=0; i<initPieces.length; i++){
			validMoves[initPieces[i]] = findValidPieceMoves(pieceIds, initPieces[i], false);
		}
		
		var finalPieces = controllingList[move.dest];
		for(var i=0; i<finalPieces.length; i++){
			validMoves[finalPieces[i]] = findValidPieceMoves(pieceIds, finalPieces[i], false);
		}
		validMoves[move.dest] = findValidPieceMoves(pieceIds, move.dest, false);
	}
}


function floodFill(kingSafetyTable, posId){
	kingSafetyTable[posId] = 1;
	var options = [];
	var newPos;
	if(posId>=8){
		options.push(-8)
		if(posId % 8 > 0){
			options.push(-9)
		}
		if(posId % 8 < 7){
			options.push(-7)
		}
	}
	if(posId % 8>0){
		options.push(-1)
	}
	if(posId % 8 < 7){
		options.push(1)
	}
	if(posId<56){
		options.push(8);
		if(posId % 8>0){
			options.push(7)
		}
		if(posId % 8 < 7){
			options.push(9)
		}
	}

	for(var i=0; i<options.length; i++){
		newPos = posId+options[i];
		if(kingSafetyTable[newPos]==0){
			floodFill(kingSafetyTable, newPos);
		}
	}

}

function genKingSafetyTable(pieceIds, side, validMoves){
	var checkTable = [];
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]===0 || pieceIds[i] === pieceToNum("K", side)){
			checkTable[i] = 0;
		}else{
			checkTable[i] = -1;
		}
	}
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]*side<0){
			if(pieceIds[i]!==pieceToNum("P", -side)){
				for(var j=0; j<validMoves[i][0].length; j++){	
					checkTable[validMoves[i][0][j]] = -1;			
				}
			}else{
				if(i%8 < 7){
					checkTable[i-8*side+1] = -1;
				}
				if(i&7 > 0){
					checkTable[i-8*side-1] = -1;
				}
			}
			for(var j=0; j<validMoves[i][1].length; j++){
				checkTable[validMoves[i][1][j]] = -1;
			}
		}
	}
	return checkTable;
}


function getNotation(pieceIds, move){
	var promotion = "";
	var finalPosId = pieceIds[move.dest];
	var capture = "";
	var check="";
	var typeId = Math.abs(move.pieceId);
	var side = Math.sign(move.pieceId);

	var pieceType = pieceTypes[typeId];
	var idLetters = pieceType;

	if(finalPosId!==noPiece){
		capture="x";
	}else{
		if((Math.abs(move.origin - move.dest)===7 || Math.abs(move.origin - move.dest)===9) && typeId===pieceToNum("P",1)){
			return file[move.origin%8]+"x"+getPosFromId(move.dest)+"e.p.";
		}
	}

	if(pieceType==="P"){
		if(capture==="x"){idLetters=file[move.origin%8];}else{idLetters="";}
		if(move.dest<8 || move.dest>=56){
			promotion="=Q";
		}
	}else{
		idLetters=pieceType;
	}

	if(pieceType=="R" || pieceType=="Q" || pieceType=="B" || pieceType=="N"){
		var moves;
		
		var initPositions = [];
		pieceIds[move.dest] = - move.pieceId;
		var capturePositions = findValidPieceMoves(pieceIds,move.dest,true)[1];
		for(var i=0; i<capturePositions.length; i++){
			if(Math.abs(pieceIds[capturePositions[i]])===typeId && capturePositions[i]!==move.origin){
				initPositions.push(capturePositions[i]);
			}
		}		
		pieceIds[move.dest] = finalPosId;
		var sameFile = false;
		var sameRank = false;
		for(var i=0; i<initPositions.length; i++){
			if(initPositions[i]%8==move.origin%8){
				sameFile = true;
			}
			if(initPositions[i]>>3==move.origin>>3){
				sameRank = true;
			}
		}
		if(initPositions.length>0){
			if(!sameFile){idLetters+=file[move.origin%8];}
			else if(!sameRank){idLetters+=move.origin>>3+1;}
			else{
				idLetters+=getPosFromId(move.origin);
			}
		}
	}
	if(pieceType==="K" && move.origin % 8 === 4){
		if(move.dest%8===6){
			return "O-O";
		}else if(move.dest%8==2){
			return "O-O-O";
		}
	}
	var pieceIds2 = pieceIds.slice();
	makeMove(pieceIds2, move, genControllingList(pieceIds), findValidMoves(pieceIds, false));
	if(detectCheck(pieceIds2, -side)){
		if(deepEvaluation(pieceIds2)[0.5+0.5*side]==0){
			check="#";
		}else{
			check="+";
		}
	}
	return idLetters+capture+getPosFromId(move.dest)+promotion+check;
}

function applyMove(move){
	if(currentSide==1){
		gameNotation.push([getNotation(pieceIds, move),""]);
	}else{
		gameNotation[gameNotation.length-1][1] = getNotation(pieceIds, move);
	}
	makeMove(pieceIds, move, genControllingList(pieceIds), findValidMoves(pieceIds, false));
	moveHistory.push(move);
	currentSide = - currentSide;
	game.push(pieceIds.slice());
	setupBoard(pieceIds);
	updateStatus();
	doPlay();
}

function startMove(initPos, side){
	if(side===currentSide && !pendingMove){
		pendingMove = true;
		document.getElementById("piece-"+initPos).style.WebkitFilter='drop-shadow(1px 1px 0 yellow) drop-shadow(-1px 1px 0 yellow) drop-shadow(1px -1px 0 yellow) drop-shadow(-1px -1px 0 yellow)';
		var possibleRays = findValidPieceMoves(pieceIds, initPos, true);
		highlightMoves(possibleRays);
		document.addEventListener('mouseup', function fmove() {
			var cell = getCell(event.clientX,event.clientY);
			if(cell!==initPos){
				var valid = false;
				for(var i=0; i<possibleRays.length; i++){
					for(var j=0; j<possibleRays[i].length; j++){
						if(possibleRays[i][j]===cell){
							valid = true;
						}	
					}
				}
				if(valid){
					applyMove({pieceId:pieceIds[initPos], origin:initPos, dest:cell});
				}else{
					document.getElementById("piece-"+initPos).style.WebkitFilter='none';
					
					document.removeEventListener('mouseup', fmove);
				}
				document.getElementById("moves").innerHTML="";	
			}
			pendingMove=false;
			document.removeEventListener('mouseup', fmove);
		});
	}
}

function validMove(pieceIds,move){
	var initPos = move.origin;
	var finalPos = move.dest;
	var pieceId = move.pieceId; 
	var j = pieceIds[finalPos];
	var valid = true;
	
	if(j*pieceId>0){
		return false;
	}
	pieceIds[initPos]=noPiece;
	pieceIds[finalPos]=pieceId;
	
	if(detectCheck(pieceIds, Math.sign(pieceId))){
		valid = false;
	}
	pieceIds[initPos] = pieceId;
	pieceIds[finalPos] = noPiece;
	
	if(j!==noPiece){
		pieceIds[finalPos] = j;
	}	
	return valid;
}

function findValidKingMoves(pieceIds, position, noCheckAllowed){
	numCalls.k++;
	var positions = [[],[]];
	var pos = position;
	var pieceId = pieceIds[position];
	var side = Math.sign(pieceId);
	var options = kingPaths;
	var p, possibleMove;
	for(var i=0; i<8; i++){
		possibleMove = adjustPosition(pos, options[i]);
		if(possibleMove!=-1){
			p = pieceIds[possibleMove];
			if(!noCheckAllowed || validMove(pieceIds, {origin:position, dest:possibleMove, pieceId:pieceId})){
				if(p===noPiece){
					positions[0].push(possibleMove);
				}else if(p*pieceId<0){
					positions[1].push(possibleMove);
				}		
			}
		}
	}	
	var row = 28 - 28*side;
	if(pos === row + 4 && (!noCheckAllowed || !detectCheck(pieceIds, side))){
		if(pieceIds[1+row]===noPiece && pieceIds[2+row]===noPiece && pieceIds[3+row]===noPiece && pieceIds[row]===pieceToNum("R", side)){
			var kingLeftPos = adjustPosition(pos, -2);
			if(validMove(pieceIds, {pieceId:pieceId, origin:position, dest:kingLeftPos})){
				pieceIds[position] = noPiece;
				pieceIds[position-1] = pieceId;
				if(!noCheckAllowed || !detectCheck(pieceIds, side)){
					positions[0].push(kingLeftPos);
				}
				pieceIds[position] = pieceId;
				pieceIds[position-1] = noPiece;
			}
		}
		if(pieceIds[5+row]===noPiece && pieceIds[6+row]===noPiece && pieceIds[7+row]===pieceToNum("R", side)){
			var kingRightPos = adjustPosition(pos, 2);
			if(validMove(pieceIds, {pieceId:pieceId, origin:position, dest:kingRightPos})){
				pieceIds[position] = noPiece;
				pieceIds[position+1] = pieceId;
				if(!noCheckAllowed || !detectCheck(pieceIds, side)){
					positions[0].push(kingRightPos);
				}
				pieceIds[position] = pieceId;
				pieceIds[position+1] = noPiece;
			}
		}
	}
	return positions;
}

function findValidPawnMoves(pieceIds, position, noCheckAllowed){
	numCalls.p++;
	var positions = [[],[]];
	var pos = position;
	var pieceId = pieceIds[pos];
	var side = pieceId > 0 ? 1 : -1;
	var leftCapturePos = pos+8*side-1;
	var rightCapturePos = pos+8*side+1;
	if(pos%8>0 && pieceIds[leftCapturePos]*side < 0){
		if(!noCheckAllowed || validMove(pieceIds, {origin:position, dest:leftCapturePos, pieceId:pieceId})){
			positions[1].push(leftCapturePos);	
		}
	}

	if(pos%8<7 && pieceIds[rightCapturePos]*side < 0){
		if(!noCheckAllowed || validMove(pieceIds, {origin:position, dest:rightCapturePos, pieceId:pieceId})){
			positions[1].push(rightCapturePos);	
		}
	}
	if(pos>>3 == 3.5 + 0.5*side){
		var move = moveHistory[moveHistory.length-1];
		if(move!=null){
			var moveDest = move.dest;
			var moveOrigin = move.origin;
			if(move.pieceId == pieceToNum("P", -side) && (moveOrigin>>3===3.5+2.5*side)){
				var enPassantLeft = adjustPosition(pos, -1);
				var enPassantRight = adjustPosition(pos, 1);
				var enl = pieceIds[enPassantLeft];
				var enr = pieceIds[enPassantRight];
				
				if(enPassantLeft!=-1 && enl*side<0 && moveDest===enPassantLeft){
					leftCapturePos = adjustPosition(pos, -1+8*side);
					if(!noCheckAllowed){
						positions[1].push(leftCapturePos);
					}else{
						var initPos = position;
						pieceIds[leftCapturePos]=pieceId;
						pieceIds[initPos]=noPiece;
						pieceIds[enPassantLeft]=noPiece;
						if(!detectCheck(pieceIds, side)){
							positions[1].push(leftCapturePos);
						}
						pieceIds[enPassantLeft] = enl;	
						pieceIds[leftCapturePos]= noPiece;
						pieceIds[initPos]=pieceId;
					}
				}
				
				if(enPassantRight!==-1 && enr*side<0 && moveDest===enPassantRight){
					rightCapturePos = adjustPosition(pos, side*8+1);
					if(!noCheckAllowed){
						positions[1].push(rightCapturePos);
					}else{
						var initPos = position;
						pieceIds[rightCapturePos]=pieceId;
						pieceIds[initPos]=noPiece;
						pieceIds[enPassantRight]=noPiece;
						if(!detectCheck(pieceIds, side)){
							positions[1].push(rightCapturePos);
						}
						pieceIds[enPassantRight] = enr;	
						pieceIds[rightCapturePos]= noPiece;
						pieceIds[initPos]=pieceId;
					}
				}
			}
		}
	}	
	if(pieceIds[pos+8*side]===noPiece){
		var forwardPos =  adjustPosition(pos, 8*side);
		if(!noCheckAllowed || validMove(pieceIds,{origin:pos, dest:forwardPos, pieceId:pieceId}, false)){
			positions[0].push(forwardPos);	
			if(pos>>3==3.5-2.5*side && pieceIds[pos+16*side]===noPiece){
				var doubleForwardPos = adjustPosition(pos, 16*side); 
				if(!noCheckAllowed || validMove(pieceIds,{origin:pos, dest:doubleForwardPos, pieceId:pieceId}, false)){
					positions[0].push(doubleForwardPos);	
				}
			}
		}else{
			if(pos>>3==3.5-2.5*side && pieceIds[pos+16*side]===noPiece){
				var doubleForwardPos = adjustPosition(pos, 16*side); 
				if(validMove(pieceIds,{origin:pos, dest:doubleForwardPos, pieceId:pieceId}, false)){
					positions[0].push(doubleForwardPos);	
				}
			}
		}
	}
	return positions;
}

function findValidPieceMoves(pieceIds, position, noCheckAllowed){
	numCalls.moves++;
	var positions = [[],[]];
	var pieceId = pieceIds[position];
	var typeId = Math.abs(pieceId);
	var side = Math.sign(pieceId);
	var pieceType = pieceTypes[typeId];
	var vectors;
	var numPaths;
	switch(pieceType){
		case 'R': vectors = rookPaths; numPaths = 4; break;
		case 'B': vectors = bishopPaths; numPaths = 4; break;
		case 'Q': vectors = queenPaths; numPaths = 8; break;
	}
	
	switch(pieceType){
		case 'R':
		case 'B':
		case 'Q':
			var pos = position;
			var p;
			for(var i=0; i<numPaths; i++){
				pos = position;
				p = noPiece;
				while(p===noPiece && pos!==-1){
					pos = adjustPosition(pos, vectors[i]);
					if(pos!==-1){
						p = pieceIds[pos];
						if(noCheckAllowed){		
							if(p===noPiece){
								if(validMove(pieceIds,{origin:position, dest:pos, pieceId:pieceId})){
									positions[0].push(pos);
								}
							}else if(p*side<0 && validMove(pieceIds,{origin:position, dest:pos, pieceId:pieceId})){
								positions[1].push(pos);
							}					
						}else{
							if(p===noPiece){
								positions[0].push(pos);
							}else if(p*side<0){
								positions[1].push(pos);
							}	
						}
					}
				}
			}
			break;
		case 'N':
			var options = knightPaths;
			var p, possibleMove;
			var pos = position;
			var pieceId = pieceIds[position];
			for(var i=0; i<8; i++){
				possibleMove = adjustPosition(pos, options[i]);
				if(possibleMove!=-1){
					p = pieceIds[possibleMove];
					if(!noCheckAllowed || validMove(pieceIds,{origin:position, dest:possibleMove, pieceId:pieceId})){
						if(p===noPiece){
							positions[0].push(possibleMove);		
						}else if(p*pieceId<0){
							positions[1].push(possibleMove);	
						}
					}
				}
			}	
			break;
		case 'K':
			positions = findValidKingMoves(pieceIds, position, noCheckAllowed);
			break;
		case 'P':
			positions = findValidPawnMoves(pieceIds, position, noCheckAllowed);
			break;
	default: return [];
	}	
	return positions;
}

function adjustPosition(pos, delta){
	var file = pos%8+(delta+20)%8 - 4;
	var finalNum; 
	if(file<8 && file>=0){
		finalNum = pos+delta;
		if(finalNum<64 && finalNum>=0){
			return finalNum;
		}
	}
	return -1;
}


function kingFreedom(pieceIds, side, validMoves, position){
	var kingSafetyTable = genKingSafetyTable(pieceIds, side, validMoves);
	var count = 0;
	if(kingSafetyTable[position]===0){
		floodFill(kingSafetyTable, position);
	}
	for(var i=0; i<numSquares; i++){
		if(kingSafetyTable[i]===1){
			count++;
		}
	}
	return count;
}

function evaluateBoard(pieceIds){
	var hash = pieceIds.toString();
	numCalls.eval++;
	if(boardTable[hash]== null){
		var scores = [0,0];
		var mobilityScore = [0,0];
		var materialScore = [0,0];
		var kingFreedomScore = [0,0];
		var possibleMoves;
		var pieceId;
		var validMoves = [];
		var kingPos = [0,0];
		for(var i=0; i<numSquares; i++){
			pieceId = pieceIds[i]; 
			if(pieceId>0){
				if(pieceId===6){
					kingPos[0] = i;
				}
				validMoves.push(findValidPieceMoves(pieceIds, i, false));
				mobilityScore[0]+= validMoves[i][0].length;
				mobilityScore[0]+= validMoves[i][1].length;
				materialScore[0]+= pieceValues[pieceId];
			}else if(pieceId<0){
				if(pieceId===-6){
					kingPos[1] = i;
				}
				validMoves.push(findValidPieceMoves(pieceIds, i, false));
				mobilityScore[1]+= validMoves[i][0].length;
				mobilityScore[1]+= validMoves[i][1].length;
				materialScore[1]+= pieceValues[-pieceId];
			}else{
				validMoves.push([]);
			}
		}
		
		if(materialScore[0]< 50 || materialScore[1] < 50){
			kingFreedomScore[0] = kingFreedom(pieceIds, 1, validMoves,kingPos[0]);
			kingFreedomScore[1] = kingFreedom(pieceIds, -1, validMoves,kingPos[1]);
		}
		scores[0] = mobilityScore[0]*0.05+materialScore[0]+kingFreedomScore[0]*0.005;
		scores[1] = mobilityScore[1]*0.05+materialScore[1]+kingFreedomScore[1]*0.005;
		numCalls.evalM++;
		boardTable[hash] = scores;
    	return scores;
	}else{
		var scores = boardTable[hash];
		return scores;
	}
}
function deepEvaluation(pieceIds){
	var scores = [0, 0];
	var mobilityScore = [0,0];
	var materialScore = [0,0];
	var possibleMoves;
	for(var i=0; i<numSquares; i++){
			if(pieceIds[i]>0){
				possibleMoves = findValidPieceMoves(pieceIds, i, true);
				mobilityScore[0]+= possibleMoves[0].length+possibleMoves[1].length;
				materialScore[0]+= pieceValues[pieceIds[i]];
			}else if(pieceIds[i]<0){
				possibleMoves = findValidPieceMoves(pieceIds, i, true);
				mobilityScore[1]+= possibleMoves[0].length+possibleMoves[1].length;
				materialScore[1]+= pieceValues[-pieceIds[i]];
			}
		}
	if(mobilityScore[0]===0){
		materialScore[0] = 0;
		if(!detectCheck(pieceIds, 1)){
			mobilityScore[1]=0;
			materialScore[1]=0;
		}
	}
	if(mobilityScore[1]===0){
		materialScore[1] = 0;
		if(!detectCheck(pieceIds, -1)){
			mobilityScore[0]=0;
			materialScore[0]=0;
		}
	}
	scores[0] = mobilityScore[0]*0.05+materialScore[0];
	scores[1] = mobilityScore[1]*0.05+materialScore[1];
	return scores;
}

function findPieceId(pieceIds, pieceId){
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]===pieceId){return i;}
	}
}

function detectCheck(pieceIds,side){
	numCalls.check++;
	var possibleThreats, numThreats;
	var posId = findPieceId(pieceIds, pieceToNum("K", side));
	if(posId== null){
		return true;
	}
	var pos = posId;
	var pLeft = adjustPosition(pos, -1+side*8);
	var pRight = adjustPosition(pos, 1+side*8);
	if((pRight!==-1 && pieceIds[pRight] == pieceToNum("P", -side)) || (pLeft!==-1 && pieceIds[pLeft] == pieceToNum("P", -side))){
		return true;
	} 
	var moves = findAllPieceMoves(pos,pieceToNum("K",side));
	for(var i=0; i<moves.length; i++){
		if(pieceIds[moves[i]]==pieceToNum("K", -side)){
			return true;
		}
	}

	var rayPieceTypes = ["R", "B", "N"];
	var threatType, pieceId, pieceType, testPiece;
	for(var j=0; j<3; j++){
		pieceType = rayPieceTypes[j];
		pieceIds[posId] = pieceToNum(pieceType, side);
		possibleThreats = findValidPieceMoves(pieceIds, pos, false)[1];
		pieceIds[posId] = pieceToNum("K", side);
		numThreats = possibleThreats.length;
		for(var i=0; i<numThreats; i++){
			pieceId = pieceIds[possibleThreats[i]];
			if(pieceId!==noPiece){
				threatType = pieceTypes[Math.abs(pieceId)];
				if(threatType===pieceType || (pieceType!=='N' && threatType==='Q')){
					return true;
				}
			}
		}
	}
	return false;
}

function getPosFromId(id){
	return file[id&7]+((id>>3)+1);
}

function setupBoard(pieceIds){
	document.getElementById("pieces").innerHTML="";
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]!=0){
			addPiece(pieceIds[i], i);
		}
	}
}
function addPiece(pieceId, position){
	var left = (12 + 52*(position%8)).toString();
	var top = (7*52 + 12 - 52*(position>>3)).toString();
	var color;
	if(pieceId<0){
		color = "b";
	}else{
		color = "w";	
	}
	var image = pieceTypes[Math.abs(pieceId)].toLowerCase()+color;
	document.getElementById("pieces").innerHTML+='<img src="'+image+'.png" id="piece-'+position+'" style="position:absolute; left:'+left+'px;top:'+top+'px;'
	+'" onclick="startMove('+position+','+Math.sign(pieceId)+')"></img>';
}