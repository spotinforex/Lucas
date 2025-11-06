import os
from google.cloud import bigquery
import logging
from datetime import datetime
import pandas as pd

logging.basicConfig( level = logging.INFO)


PROJECT = os.environ.get("PROJECT")

def database_conn():
    """Simple database connection helper"""
    client = bigquery.Client(project = PROJECT)
    return client
        
def fetch_from_db(ticker, interval, start_period, end_period):
    """Check DB for cached results"""
    try:
        logging.info("Connecting to Database")
        conn = database_conn()
        logging.info("Connected to Database")

        query = """
            SELECT timestamp, open, high, low, close, volume
            FROM `lucas_data.market_data`
            WHERE ticker = @ticker
              AND timeframe = @timeframe
              AND timestamp BETWEEN @start_period AND @end_period
            ORDER BY timestamp ASC
        """
        
        job_config = bigquery.QueryJobConfig(
                use_legacy_sql=False,
                query_parameters=[
                    bigquery.ScalarQueryParameter("ticker", "STRING", ticker),
                    bigquery.ScalarQueryParameter("timeframe", "STRING", interval),
                    bigquery.ScalarQueryParameter("start_period", "STRING", start_period),
                    bigquery.ScalarQueryParameter("end_period", "STRING", end_period),
                    ]
                )
                
        results = conn.query(query, job_config = job_config).to_dataframe()
        
        logging.info(f"Data From {ticker}, Rows: {len(results)} Retrived Successfully")
        return results

    except Exception as e:
        logging.error(f"Database fetch error: {e}")
        return None

def store_in_db(ticker, interval, dataframe):
    """Store fresh data into BigQuery (supports multiple rows)"""
    if dataframe is None or dataframe.empty:
        logging.warning(f"No data to insert for {ticker}")
        return

    try:
        logging.info("Connecting to Database")
        conn = database_conn()
        logging.info("Connected to Database")

        # Ensure column names match your BigQuery table
        expected_columns = ["timestamp", "open", "high", "low", "close", "volume"]
        missing = [col for col in expected_columns if col not in dataframe.columns]
        if missing:
            raise ValueError(f"Missing columns in dataframe: {missing}")

        # Add ticker and interval columns to match schema
        dataframe["ticker"] = ticker
        dataframe["timeframe"] = interval

        table_id = f"{PROJECT}.lucas_data.market_data"
        job = conn.load_table_from_dataframe(
            dataframe,
            table_id,
            job_config=bigquery.LoadJobConfig(
                write_disposition="WRITE_APPEND"
            )
        )
        job.result()  # Wait for the job to complete
        logging.info(f"Inserted {len(dataframe)} rows for {ticker} ({interval}) into BigQuery.")

    except Exception as e:
        logging.error(f"Failed to store data for {ticker}: {e}", exc_info=True)


