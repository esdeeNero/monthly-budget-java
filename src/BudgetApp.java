import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.math.*;
import java.util.*;

public class BudgetApp {
    static long money(Map<String,String> p, String key) {
        try {
            var v = new BigDecimal(p.getOrDefault(key,"0").replace(',','.'));
            if(v.signum()<0 || v.compareTo(new BigDecimal("1000000000"))>0) throw new Exception();
            return v.setScale(2,RoundingMode.HALF_UP).movePointRight(2).longValueExact();
        } catch(Exception e) {throw new IllegalArgumentException("Суммы должны быть от 0 до 1 млрд рублей.");}
    }
    static long share(long value,long first,long total) {
        return total==0?0:BigDecimal.valueOf(value).multiply(BigDecimal.valueOf(first)).divide(BigDecimal.valueOf(total),0,RoundingMode.HALF_UP).longValueExact();
    }
    static String calculate(Map<String,String> p) {
        int months;
        try {months=Integer.parseInt(p.getOrDefault("months","0"));}
        catch(Exception e){throw new IllegalArgumentException("Срок — целое число месяцев.");}
        if(months<1||months>600) throw new IllegalArgumentException("Укажите срок от 1 до 600 месяцев.");
        long first=money(p,"first"),second=money(p,"second"),income=first+second;
        long expenses=money(p,"housing")+money(p,"food")+money(p,"transport")+money(p,"other");
        long reserve=money(p,"reserve"),remaining=Math.max(0,money(p,"goal")-money(p,"saved"));
        long saving=(remaining+months-1)/months,available=income-expenses-reserve,free=available-saving;
        long fs=share(saving,first,income),fe=share(expenses,first,income),fr=share(reserve,first,income);
        long possible=remaining==0?0:available>0?(remaining+available-1)/available:-1;
        return String.format(Locale.ROOT,"{\"income\":%d,\"expenses\":%d,\"reserve\":%d,\"remaining\":%d,\"saving\":%d,\"available\":%d,\"free\":%d,\"possibleMonths\":%d,\"firstSaving\":%d,\"secondSaving\":%d,\"firstExpenses\":%d,\"secondExpenses\":%d,\"firstReserve\":%d,\"secondReserve\":%d,\"firstFree\":%d,\"secondFree\":%d}",income,expenses,reserve,remaining,saving,available,free,possible,fs,saving-fs,fe,expenses-fe,fr,reserve-fr,first-fs-fe-fr,second-(saving-fs)-(expenses-fe)-(reserve-fr));
    }
    public static void main(String[] args)throws Exception {
        int port=Integer.parseInt(System.getenv().getOrDefault("PORT","8080"));
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",port),0);
        server.createContext("/",ex->{
            byte[] body;int status=200;String type="text/html; charset=utf-8";
            try {
                String path=ex.getRequestURI().getPath();
                if(path.equals("/api/plan")){
                    type="application/json; charset=utf-8";
                    if(!ex.getRequestMethod().equals("POST")){status=405;body="{}".getBytes();}
                    else{
                        byte[] input=ex.getRequestBody().readNBytes(16385);
                        if(input.length>16384)throw new IllegalArgumentException("Слишком большой запрос.");
                        Map<String,String> p=new HashMap<>();
                        for(String pair:new String(input,StandardCharsets.UTF_8).split("&")){
                            String[] kv=pair.split("=",2);
                            if(kv.length==2)p.put(URLDecoder.decode(kv[0],StandardCharsets.UTF_8),URLDecoder.decode(kv[1],StandardCharsets.UTF_8));
                        }
                        body=calculate(p).getBytes(StandardCharsets.UTF_8);
                    }
                }else{
                    String file=switch(path){case "/"->"index.html";case "/style.css"->"style.css";case "/app.js"->"app.js";default->"";};
                    if(file.isEmpty()){status=404;body="Not found".getBytes();}
                    else{type=file.endsWith("css")?"text/css; charset=utf-8":file.endsWith("js")?"text/javascript; charset=utf-8":type;body=Files.readAllBytes(Path.of("public",file));}
                }
            }catch(IllegalArgumentException e){status=400;type="application/json; charset=utf-8";body=("{\"error\":\""+e.getMessage()+"\"}").getBytes(StandardCharsets.UTF_8);}
            catch(Exception e){status=500;body="Server error".getBytes();}
            ex.getResponseHeaders().set("Content-Type",type);ex.getResponseHeaders().set("Cache-Control","no-store");
            ex.sendResponseHeaders(status,body.length);ex.getResponseBody().write(body);ex.close();
        });
        server.start();System.out.println("Открой http://localhost:"+port);
    }
}
